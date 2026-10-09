import type { DraftStatus } from '@/lib/review/types';
import { Icon } from '../Icon';
import { AuthorPanel } from './AuthorPanel';
import { ReviewerPanel } from './ReviewerPanel';

export interface ReviewActionsProps {
  docId: string;
  status: DraftStatus;
  /** The draft revision on screen, so an approval publishes exactly what was reviewed. */
  revision: number;
  canWrite: boolean;
  isReviewer: boolean;
  canManage: boolean;
  staleReason: string | null;
}

const HEADLINE: Record<DraftStatus, { title: string; body: string }> = {
  draft: { title: 'Draft in progress', body: 'Not submitted yet. Submit it when it’s ready for a reviewer.' },
  in_review: { title: 'Waiting for review', body: 'A reviewer can approve and publish it, or send it back with feedback.' },
  changes_requested: {
    title: 'Changes requested',
    body: 'A reviewer sent this back. Revise the draft, then resubmit it.',
  },
};

/** The action card on the review page — what this viewer can do with the draft right now. */
export function ReviewActions(props: ReviewActionsProps) {
  const { docId, status, revision, canWrite, isReviewer, canManage, staleReason } = props;
  const headline = HEADLINE[status];
  const reviewing = isReviewer && status === 'in_review';
  const canEdit = canWrite && (status !== 'in_review' || canManage);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-semibold text-gray-900">{headline.title}</p>
      <p className="mt-0.5 text-sm text-gray-500">{headline.body}</p>

      {staleReason && (
        <p className="mt-3 flex gap-2 rounded-lg bg-orange-50 p-2.5 text-xs text-orange-900 ring-1 ring-orange-200">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          {staleReason}
        </p>
      )}

      {canWrite ? (
        <div className="mt-4 space-y-2">
          {reviewing && <ReviewerPanel docId={docId} revision={revision} staleReason={staleReason} />}
          {(canManage || canEdit) && (
            <div className={reviewing ? 'border-t border-gray-100 pt-2' : ''}>
              <AuthorPanel docId={docId} status={status} canManage={canManage} canEdit={canEdit} />
            </div>
          )}
          {status === 'in_review' && !isReviewer && !canManage && (
            <p className="text-xs text-gray-500">Only reviewers can approve. You can still leave a comment below.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Icon name="lock" className="h-3.5 w-3.5" />
          You have read-only access.
        </p>
      )}
    </div>
  );
}
