import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDraft, readDocumentOrNull } from '@/lib/review';
import type { Draft } from '@/lib/review';
import type { ContextNode } from '@promptowl/contextnest-engine';
import { ActivityThread } from '@/components/vault/ActivityThread';
import { DiffView } from '@/components/vault/DiffView';
import { DocBreadcrumbs } from '@/components/vault/DocBreadcrumbs';
import { EmptyState } from '@/components/vault/EmptyState';
import { Icon } from '@/components/vault/Icon';
import { Markdown } from '@/components/vault/Markdown';
import { RelativeTime } from '@/components/vault/RelativeTime';
import { ReviewActions } from '@/components/vault/ReviewActions';
import { DraftStatusBadge, NewBadge, TypeBadge } from '@/components/vault/StatusBadge';
import { Tabs } from '@/components/vault/Tabs';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { loadLinkIndex } from '@/lib/vault-ui/data';
import { parseSnapshot, snapshotOf } from '@/lib/vault-ui/doc-data';
import { decodeSegments, vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  params: Promise<{ vaultId: string; path: string[] }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  return { title: `Review · ${decodeSegments(path)}` };
}

function staleReasonFor(draft: Draft, node: ContextNode | null): string | null {
  if (draft.isNew && node) {
    return `Someone published “${draft.docId}” after this draft was started. Approving will overwrite it.`;
  }
  const live = node?.frontmatter.version ?? null;
  if (!draft.isNew && node && live !== draft.baseVersion) {
    return `The published document moved to v${live} after this draft was started from v${draft.baseVersion ?? '–'}. Approving will replace those newer changes.`;
  }
  return null;
}

function involves(draft: Draft, login: string): boolean {
  const l = login.toLowerCase();
  return draft.author.toLowerCase() === l || draft.contributors.some((c) => c.toLowerCase() === l);
}

export default async function ReviewDraftPage({ params, searchParams }: Props) {
  const [{ vaultId, path }, { tab }] = await Promise.all([params, searchParams]);
  const urls = vaultUrls(vaultId);
  const docId = decodeSegments(path);
  const viewer = await requireViewer();
  const { storage } = engineFor(viewer, vaultId);
  const [draft, node, linkIndex] = await Promise.all([
    getDraft(storage, docId),
    readDocumentOrNull(storage, docId),
    loadLinkIndex(vaultId),
  ]);

  if (!draft) {
    if (!node) notFound();
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          icon="check"
          title="No pending changes"
          action={
            <Link href={urls.doc(docId)} className={buttonClass('primary')}>
              Open the document
            </Link>
          }
        >
          This draft was approved or discarded. The document is up to date.
        </EmptyState>
      </div>
    );
  }

  const after = parseSnapshot(docId, draft.content);
  const before = node ? snapshotOf(node) : null;
  const liveVersion = node?.frontmatter.version ?? null;
  const staleReason = staleReasonFor(draft, node);
  const canWrite = viewer.access === 'write';
  const canManage = canWrite && (viewer.isReviewer || involves(draft, viewer.login));
  const lastFeedback =
    draft.status === 'changes_requested'
      ? [...draft.activity].reverse().find((a) => a.kind === 'changes_requested')
      : undefined;

  const active = tab === 'preview' ? 'preview' : tab === 'current' && node ? 'current' : 'changes';
  const others = draft.contributors.filter((c) => c !== draft.author);

  return (
    <div className={`${PAGE_CONTAINER} py-6`}>
      <div className="flex items-center gap-3 text-sm">
        <Link href={urls.review()} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900">
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          Review queue
        </Link>
        <span className="text-gray-300">/</span>
        <DocBreadcrumbs vaultId={vaultId} docId={docId} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{after.title || docId}</h1>
        <DraftStatusBadge status={draft.status} />
        {draft.isNew && <NewBadge />}
        {after.type !== 'document' && <TypeBadge type={after.type} />}
      </div>
      <p className="mt-1.5 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{draft.author}</span>
        {others.length > 0 && <> with {others.join(', ')}</>}
        {draft.isNew ? ' · new document' : ` · based on v${draft.baseVersion ?? '–'}`}
        {' · '}revision {draft.revision}
        {' · '}updated <RelativeTime iso={draft.updatedAt} />
        {node && (
          <>
            {' · '}
            <Link href={urls.doc(docId)} className="text-indigo-600 hover:underline">
              view published{liveVersion ? ` v${liveVersion}` : ''}
            </Link>
          </>
        )}
      </p>

      {lastFeedback?.message && (
        <div className="mt-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <Icon name="undo" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-rose-900">
              {lastFeedback.actor} requested changes <span className="font-normal text-rose-700">· <RelativeTime iso={lastFeedback.at} /></span>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-rose-900">{lastFeedback.message}</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Tabs
          active={active}
          tabs={[
            { key: 'changes', label: 'Changes', icon: 'diff', href: urls.reviewDraft(docId) },
            { key: 'preview', label: 'Preview', icon: 'eye', href: urls.reviewDraft(docId, 'preview') },
            ...(node
              ? [{ key: 'current', label: `Published${liveVersion ? ` v${liveVersion}` : ''}`, icon: 'file' as const, href: urls.reviewDraft(docId, 'current') }]
              : []),
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {active === 'changes' ? (
            <DiffView
              before={before}
              after={after}
              beforeLabel={node ? `Published${liveVersion ? ` v${liveVersion}` : ''}` : 'Nothing (new document)'}
              afterLabel={`Draft · revision ${draft.revision}`}
            />
          ) : (
            <article className="rounded-xl bg-white px-6 py-8 shadow-sm ring-1 ring-gray-200 sm:px-10">
              {(() => {
                const shown = active === 'current' && before ? before : after;
                return shown.body.trim() ? (
                  <Markdown source={shown.body} links={{ vaultId, index: linkIndex }} />
                ) : (
                  <p className="text-center text-sm text-gray-400">No content.</p>
                );
              })()}
            </article>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ReviewActions
            docId={docId}
            status={draft.status}
            canWrite={canWrite}
            isReviewer={viewer.isReviewer}
            canManage={canManage}
            staleReason={staleReason}
          />
          <ActivityThread docId={docId} activity={draft.activity} canComment={canWrite} />
        </aside>
      </div>
    </div>
  );
}
