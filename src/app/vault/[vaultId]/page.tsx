import Link from 'next/link';
import { DocList } from '@/components/vault/DocList';
import { EmptyState } from '@/components/vault/EmptyState';
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

  return (
    <div className={`${PAGE_CONTAINER} flex gap-8 py-6`}>
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Folders</p>
          <FolderTree root={tree} activeFolder={folder} />
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
            <Link href={urls.newDoc(folder || undefined)} className={buttonClass('secondary')}>
              <Icon name="plus" />
              New document{folder ? ' here' : ''}
            </Link>
          )}
        </div>

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
  );
}
