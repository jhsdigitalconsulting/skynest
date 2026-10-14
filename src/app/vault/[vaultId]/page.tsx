import Link from 'next/link';
import { DocList } from '@/components/vault/DocList';
import { EmptyState } from '@/components/vault/EmptyState';
import { FolderActionsProvider, NewFolderButton } from '@/components/vault/FolderActions';
import { FolderTree } from '@/components/vault/FolderTree';
import { Icon } from '@/components/vault/Icon';
import { TypeFilter } from '@/components/vault/TypeFilter';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { requireViewer } from '@/lib/vault-ui/context';
import { effectiveRoot, uiRootFor, visibleNodes } from '@/lib/vault-ui/content-root';
import {
  buildFolderTree,
  excerptFor,
  folderOf,
  loadDrafts,
  loadNodes,
  searchNodes,
  toListItem,
} from '@/lib/vault-ui/data';
import { flattenFolders } from '@/lib/vault-ui/folder-path';
import { vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  params: Promise<{ vaultId: string }>;
  searchParams: Promise<{ folder?: string; q?: string; type?: string }>;
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const { vaultId } = await params;
  const urls = vaultUrls(vaultId);
  const { folder = '', q = '', type } = await searchParams;
  const [viewer, allNodes, drafts] = await Promise.all([requireViewer(), loadNodes(vaultId), loadDrafts(vaultId)]);
  const nodes = visibleNodes(allNodes, uiRootFor(vaultId));
  const root = effectiveRoot(nodes, uiRootFor(vaultId));
  const draftByDoc = new Map(drafts.map((d) => [d.docId, d]));
  const query = q.trim();

  const tree = buildFolderTree(nodes.map((n) => ({ folder: folderOf(n.id) })), root);
  const inFolder = folder ? nodes.filter((n) => n.id.startsWith(`${folder}/`)) : nodes;
  const matched = query ? searchNodes(inFolder, query) : inFolder;

  const typeCounts = new Map<string, number>();
  for (const n of matched) {
    const t = n.frontmatter.type ?? 'document';
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const types = [...typeCounts.entries()].map(([t, count]) => ({ type: t, count })).sort((a, b) => b.count - a.count);
  const shown = type ? matched.filter((n) => (n.frontmatter.type ?? 'document') === type) : matched;
  const items = shown.map((n) => ({
    ...toListItem(n, draftByDoc.get(n.id)),
    excerpt: query ? excerptFor(n, query) : null,
  }));

  const crumbs = folder ? folder.split('/') : [];
  const hiddenCrumbs = root && folder.startsWith(root) ? root.split('/').length : 0;
  const canWrite = viewer.access === 'write';
  const existingFolders = flattenFolders(tree);

  return (
    <FolderActionsProvider rootPath={tree.path} existingFolders={existingFolders}>
    <div className={`${PAGE_CONTAINER} flex gap-8 py-6`}>
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Folders</p>
          <FolderTree root={tree} activeFolder={folder} canWrite={canWrite} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <nav className="mb-1 flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
              <Link href={urls.browse({ q: query || undefined })} className="hover:text-gray-900">
                Vault
              </Link>
              {crumbs.map((part, i) => {
                if (i < hiddenCrumbs) return null;
                const path = crumbs.slice(0, i + 1).join('/');
                return (
                  <span key={path} className="flex items-center gap-1">
                    <Icon name="chevronRight" className="h-3.5 w-3.5 text-gray-300" />
                    <Link href={urls.browse({ folder: path, q: query || undefined })} className="hover:text-gray-900">
                      {part}
                    </Link>
                  </span>
                );
              })}
            </nav>
            <h1 className="text-xl font-semibold text-gray-900">
              {query ? (
                <>
                  Results for <span className="text-indigo-600">“{query}”</span>
                </>
              ) : (
                (crumbs.at(-1) ?? 'All documents')
              )}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'document' : 'documents'}
              {query && folder ? ` in ${folder}` : ''}
            </p>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <NewFolderButton parent={folder || tree.path} />
              <Link href={urls.newDoc(folder || undefined)} className={buttonClass('secondary')}>
                <Icon name="plus" />
                New document{folder ? ' here' : ''}
              </Link>
            </div>
          )}
        </div>

        {/* The sidebar tree is desktop-only; smaller screens get it behind a disclosure. */}
        {tree.children.length > 0 && (
          <details className="mb-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 lg:hidden">
            <summary className="flex h-10 cursor-pointer items-center gap-2 px-3 text-sm font-medium text-gray-700">
              <Icon name="folder" className="h-4 w-4 text-gray-500" />
              Folders
              <span className="ml-auto truncate text-xs font-normal text-gray-500">{crumbs.at(-1) ?? 'All documents'}</span>
            </summary>
            <div className="border-t border-gray-100 p-2">
              <FolderTree root={tree} activeFolder={folder} canWrite={canWrite} />
            </div>
          </details>
        )}

        <div className="mb-4">
          <TypeFilter vaultId={vaultId} types={types} active={type ?? null} folder={folder || undefined} q={query || undefined} />
        </div>

        {items.length > 0 ? (
          <DocList vaultId={vaultId} items={items} folder={folder || undefined} />
        ) : query ? (
          <EmptyState
            icon="search"
            title="No documents match"
            action={
              <Link href={urls.browse({ folder: folder || undefined })} className={buttonClass('secondary')}>
                Clear search
              </Link>
            }
          >
            Nothing{folder ? ` in ${folder}` : ''} matches “{query}”. Try fewer or different words.
          </EmptyState>
        ) : (
          <EmptyState
            icon="file"
            title={nodes.length ? 'This folder is empty' : 'Your vault is empty'}
            action={
              canWrite ? (
                <Link href={urls.newDoc(folder || undefined)} className={buttonClass('primary')}>
                  <Icon name="plus" />
                  Create the first document
                </Link>
              ) : undefined
            }
          >
            Documents created here, or by agents over MCP, show up in this list.
          </EmptyState>
        )}
      </main>
    </div>
    </FolderActionsProvider>
  );
}
