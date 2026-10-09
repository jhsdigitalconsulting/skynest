import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getDraft, readDocumentOrNull, summarizeDraft } from '@/lib/review';
import { DiffView } from '@/components/vault/DiffView';
import { DocBreadcrumbs } from '@/components/vault/DocBreadcrumbs';
import { DocDetails } from '@/components/vault/DocDetails';
import { Icon } from '@/components/vault/Icon';
import { Markdown } from '@/components/vault/Markdown';
import { PendingDraftBanner } from '@/components/vault/PendingDraftBanner';
import { RestoreVersionButton } from '@/components/vault/RestoreVersionButton';
import { DocStatusBadge, TypeBadge } from '@/components/vault/StatusBadge';
import { Tabs } from '@/components/vault/Tabs';
import { VersionHistory } from '@/components/vault/VersionHistory';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { loadLinkIndex } from '@/lib/vault-ui/data';
import { loadHistory, loadVersionSnapshot, snapshotOf } from '@/lib/vault-ui/doc-data';
import { decodeSegments, vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  params: Promise<{ vaultId: string; path: string[] }>;
  searchParams: Promise<{ tab?: string; v?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  return { title: decodeSegments(path) };
}

export default async function DocPage({ params, searchParams }: Props) {
  const [{ vaultId, path }, { tab, v }] = await Promise.all([params, searchParams]);
  const urls = vaultUrls(vaultId);
  const docId = decodeSegments(path);
  const viewer = await requireViewer();
  const { storage } = engineFor(viewer, vaultId);

  const [node, draft] = await Promise.all([readDocumentOrNull(storage, docId), getDraft(storage, docId)]);
  if (!node) {
    // A brand-new document only exists as a draft until it's approved.
    if (draft) redirect(urls.reviewDraft(docId));
    notFound();
  }

  const fm = node.frontmatter;
  const canWrite = viewer.access === 'write';
  const [history, linkIndex] = await Promise.all([loadHistory(storage, docId), loadLinkIndex(vaultId)]);
  const activeTab = tab === 'history' ? 'history' : 'content';
  const selectedVersion = activeTab === 'history' && v ? Number.parseInt(v, 10) : null;
  const versionSnapshot =
    selectedVersion !== null && Number.isFinite(selectedVersion)
      ? await loadVersionSnapshot(storage, docId, selectedVersion)
      : null;

  return (
    <div className={`${PAGE_CONTAINER} py-6`}>
      <DocBreadcrumbs vaultId={vaultId} docId={docId} />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{fm.title || docId}</h1>
            <DocStatusBadge status={fm.status ?? 'draft'} version={fm.version} />
            {fm.type && fm.type !== 'document' && <TypeBadge type={fm.type} />}
          </div>
          {fm.description && <p className="mt-1.5 max-w-3xl text-gray-600">{fm.description}</p>}
          {fm.tags && fm.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {fm.tags.map((tag) => (
                <Link
                  key={tag}
                  href={urls.browse({ q: tag })}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
        {canWrite && (
          <div className="flex shrink-0 gap-2">
            {draft ? (
              <Link href={urls.reviewDraft(docId)} className={buttonClass('secondary')}>
                <Icon name="diff" />
                View draft
              </Link>
            ) : null}
            <Link href={urls.edit(docId)} className={buttonClass('primary')}>
              <Icon name="edit" />
              {draft ? 'Edit draft' : 'Edit'}
            </Link>
          </div>
        )}
      </div>

      {draft && (
        <div className="mt-5">
          <PendingDraftBanner vaultId={vaultId} draft={summarizeDraft(draft)} canEdit={canWrite} />
        </div>
      )}

      <div className="mt-6">
        <Tabs
          active={activeTab}
          tabs={[
            { key: 'content', label: 'Content', icon: 'file', href: urls.doc(docId) },
            { key: 'history', label: 'History', icon: 'history', href: urls.doc(docId, { tab: 'history' }), count: history.length },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          {activeTab === 'content' ? (
            <article className="rounded-xl bg-white px-6 py-8 shadow-sm ring-1 ring-gray-200 sm:px-10">
              {node.body.trim() ? (
                <Markdown source={node.body} links={{ vaultId, index: linkIndex }} />
              ) : (
                <p className="text-center text-sm text-gray-400">This document has no content yet.</p>
              )}
            </article>
          ) : selectedVersion !== null ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
                <p className="text-sm text-indigo-900">
                  Changes from <span className="font-semibold">v{selectedVersion}</span> to the current version
                  {fm.version ? ` (v${fm.version})` : ''}
                </p>
                <div className="flex gap-2">
                  <Link href={urls.doc(docId, { tab: 'history' })} scroll={false} className={buttonClass('ghost', 'sm')}>
                    <Icon name="arrowLeft" className="h-3.5 w-3.5" />
                    All versions
                  </Link>
                  {canWrite && selectedVersion !== fm.version && (
                    <RestoreVersionButton docId={docId} version={selectedVersion} hasDraft={!!draft} />
                  )}
                </div>
              </div>
              {versionSnapshot ? (
                <DiffView
                  before={versionSnapshot}
                  after={snapshotOf(node)}
                  beforeLabel={`v${selectedVersion}`}
                  afterLabel={`Current${fm.version ? ` (v${fm.version})` : ''}`}
                />
              ) : (
                <p className="rounded-xl bg-white p-6 text-sm text-gray-500 ring-1 ring-gray-200">
                  Version {selectedVersion} couldn’t be reconstructed from this document’s history.
                </p>
              )}
            </div>
          ) : (
            <VersionHistory
              vaultId={vaultId}
              docId={docId}
              versions={history}
              currentVersion={fm.version ?? null}
              selected={null}
              canWrite={canWrite}
              hasDraft={!!draft}
            />
          )}
        </div>
        <aside className="space-y-4">
          <DocDetails node={node} />
          {activeTab === 'history' && selectedVersion !== null && history.length > 0 && (
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-200">
              <p className="px-2 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">Versions</p>
              {history.map((h) => (
                <Link
                  key={h.version}
                  href={urls.doc(docId, { tab: 'history', version: h.version })}
                  scroll={false}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    h.version === selectedVersion ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>v{h.version}</span>
                  <span className="truncate pl-2 text-xs text-gray-400">{h.editedBy}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
