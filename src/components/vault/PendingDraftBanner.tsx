import Link from 'next/link';
import type { DraftSummary } from '@/lib/review/types';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';
import { RelativeTime } from './RelativeTime';
import { buttonClass } from './button-styles';

interface Props {
  vaultId: string;
  draft: DraftSummary;
  canEdit: boolean;
}

const COPY = {
  draft: { tone: 'border-gray-200 bg-white', icon: 'text-gray-500', text: 'has unsubmitted changes to this document' },
  in_review: { tone: 'border-amber-200 bg-amber-50', icon: 'text-amber-600', text: 'submitted changes to this document for review' },
  changes_requested: {
    tone: 'border-rose-200 bg-rose-50',
    icon: 'text-rose-600',
    text: 'is revising changes to this document after review feedback',
  },
} as const;

/** Shown on a document when someone has a draft of it in flight. */
export function PendingDraftBanner({ vaultId, draft, canEdit }: Props) {
  const urls = vaultUrls(vaultId);
  const copy = COPY[draft.status];
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${copy.tone}`}>
      <Icon name={draft.status === 'in_review' ? 'inbox' : 'draft'} className={`h-5 w-5 shrink-0 ${copy.icon}`} />
      <p className="min-w-0 flex-1 text-sm text-gray-700">
        <span className="font-medium text-gray-900">{draft.author}</span> {copy.text}
        {' · '}
        <span className="text-gray-500">
          updated <RelativeTime iso={draft.updatedAt} />
        </span>
        {draft.commentCount > 0 && (
          <span className="text-gray-500">
            {' · '}
            {draft.commentCount} {draft.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </p>
      <div className="flex gap-2">
        <Link href={urls.reviewDraft(draft.docId)} className={buttonClass('secondary', 'sm')}>
          <Icon name="diff" className="h-3.5 w-3.5" />
          View changes
        </Link>
        {canEdit && draft.status !== 'in_review' && (
          <Link href={urls.edit(draft.docId)} className={buttonClass('primary', 'sm')}>
            <Icon name="edit" className="h-3.5 w-3.5" />
            Continue editing
          </Link>
        )}
      </div>
    </div>
  );
}
