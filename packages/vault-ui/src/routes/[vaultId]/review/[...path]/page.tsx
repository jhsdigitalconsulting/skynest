import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDraft, readDocumentOrNull, staleReasonFor } from '../../../../review';
import type { Draft } from '../../../../review';
import { ActivityThread } from '../../../../components/ActivityThread';
import { DiffView } from '../../../../components/DiffView';
import { DraftPaneLayout } from '../../../../components/DraftPaneLayout';
import { DocBreadcrumbs } from '../../../../components/DocBreadcrumbs';
import { EmptyState } from '../../../../components/EmptyState';
import { Icon } from '../../../../components/Icon';
import { Markdown } from '../../../../components/Markdown';
import { RelativeTime } from '../../../../components/RelativeTime';
import { ReviewActions } from '../../../../components/ReviewActions';
import { DraftStatusBadge, NewBadge, TypeBadge } from '../../../../components/StatusBadge';
import { Tabs } from '../../../../components/Tabs';
import { buttonClass } from '../../../../components/button-styles';
import { engineFor, requireViewer } from '../../../../lib/context';
import { Editor } from '../../../../components/Editor';
import { draftLockReason, loadFolders } from '../../../../lib/editor-data';
import { folderOf, loadLinkIndex } from '../../../../lib/data';
import { parseSnapshot, snapshotOf } from '../../../../lib/doc-data';
import { decodeSegments, vaultUrls } from '../../../../lib/paths';

interface Props {
  params: Promise<{ vaultId: string; path: string[] }>;
  searchParams: Promise<{ tab?: string; list?: string; edit?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  return { title: `Review · ${decodeSegments(path)}` };
}

function involves(draft: Draft, login: string): boolean {
  const l = login.toLowerCase();
  return draft.author.toLowerCase() === l || draft.contributors.some((c) => c.toLowerCase() === l);
}

export default async function ReviewDraftPage({ params, searchParams }: Props) {
  const [{ vaultId, path }, { tab, list, edit }] = await Promise.all([params, searchParams]);
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

  if (edit === '1' && viewer.access === 'write') {
    const folders = await loadFolders(vaultId);
    return (
      <Editor
        key={docId}
        docId={docId}
        isNew={draft.isNew}
        initial={parseSnapshot(docId, draft.content)}
        revision={draft.revision}
        status={draft.status}
        isReviewer={viewer.isReviewer}
        defaultFolder={folderOf(docId)}
        folders={folders}
        lockedReason={draftLockReason(draft, viewer)}
        linkIndex={linkIndex}
        queueList={list ?? ''}
      />
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

  // The note the author left when they last sent it for review.
  const submitNote = [...draft.activity].reverse().find((a) => a.kind === 'submitted');

  const actions = (
    <ReviewActions
      docId={docId}
      status={draft.status}
      revision={draft.revision}
      canWrite={canWrite}
      isReviewer={viewer.isReviewer}
      canManage={canManage}
      staleReason={staleReason}
      queueList={list ?? ''}
    />
  );

  // Preview first: most reviews start by reading the draft as it will appear, then checking the diff.
  const active = tab === 'changes' ? 'changes' : tab === 'current' && node ? 'current' : 'preview';
  const others = draft.contributors.filter((c) => c !== draft.author);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-sm">
        {/* The queue is always on screen beside the draft on wide screens, so the way back is only needed below that. */}
        <Link href={urls.review(list)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 lg:hidden">
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          Review queue
        </Link>
        <span className="text-gray-300 lg:hidden">/</span>
        <DocBreadcrumbs vaultId={vaultId} docId={docId} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-gray-900 [overflow-wrap:anywhere]">{after.title || docId}</h1>
        <DraftStatusBadge status={draft.status} />
        {draft.isNew && <NewBadge />}
        {after.type !== 'document' && <TypeBadge type={after.type} />}
      </div>
      <p className="mt-1.5 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{draft.author}</span>
        {others.length > 0 && <> with {others.join(', ')}</>}
        {draft.isNew ? ' · new document' : ` · based on v${draft.baseVersion ?? '–'}`}
        {' · '}revision {draft.revision}
        {submitNote && (
          <>
            {' · '}submitted <RelativeTime iso={submitNote.at} />
          </>
        )}
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

      {submitNote?.message && !lastFeedback?.message && (
        <div className="mt-5 flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <Icon name="send" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-indigo-900">
              {submitNote.actor}&rsquo;s note <span className="font-normal text-indigo-700">· submitted <RelativeTime iso={submitNote.at} /></span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-indigo-900">{submitNote.message}</p>
          </div>
        </div>
      )}

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

      {/* On small screens the sidebar falls below the diff, so show the actions up front too. */}
      <div className="mt-5 xl:hidden">{actions}</div>

      <div className="mt-6">
        <Tabs
          active={active}
          tabs={[
            { key: 'preview', label: 'Preview', icon: 'eye', href: urls.reviewDraft(docId, undefined, list) },
            { key: 'changes', label: 'Changes', icon: 'diff', href: urls.reviewDraft(docId, 'changes', list) },
            ...(node
              ? [{ key: 'current', label: `Published${liveVersion ? ` v${liveVersion}` : ''}`, icon: 'file' as const, href: urls.reviewDraft(docId, 'current', list) }]
              : []),
          ]}
        />
      </div>

      <DraftPaneLayout
        side={
          <>
            <div className="hidden xl:block">{actions}</div>
            <ActivityThread docId={docId} activity={draft.activity} canComment={canWrite} />
          </>
        }
      >
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
                  <p className="text-center text-sm text-gray-500">No content.</p>
                );
              })()}
            </article>
          )}
      </DraftPaneLayout>
    </div>
  );
}
