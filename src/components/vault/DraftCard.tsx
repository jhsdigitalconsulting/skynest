import Link from 'next/link';
import type { DraftSummary } from '@/lib/review/types';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';
import { RelativeTime } from './RelativeTime';
import { DraftStatusBadge, NewBadge } from './StatusBadge';

interface Props {
  vaultId: string;
  draft: DraftSummary;
  /** Published version the draft would replace, when the document exists. */
  liveVersion: number | null;
}

/** One row in the review queue: what changed, who changed it, and where it stands. */
export function DraftCard({ vaultId, draft, liveVersion }: Props) {
  const urls = vaultUrls(vaultId);
  const stale = !draft.isNew && liveVersion !== null && liveVersion !== draft.baseVersion;
  const others = draft.contributors.filter((c) => c !== draft.author);
  return (
    <li>
      <Link
        href={urls.reviewDraft(draft.docId)}
        className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold uppercase text-indigo-700">
          {draft.author.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-gray-900 group-hover:text-indigo-700">{draft.title || draft.docId}</span>
            <DraftStatusBadge status={draft.status} />
            {draft.isNew && <NewBadge />}
            {stale && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700">
                <Icon name="alert" className="h-3 w-3" />
                Out of date
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{draft.docId}</p>
          <p className="mt-1.5 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{draft.author}</span>
            {others.length > 0 && <span> and {others.length === 1 ? others[0] : `${others.length} others`}</span>}
            {draft.isNew ? ' proposed a new document' : ` edited v${draft.baseVersion ?? '–'}`}
            {' · '}
            {draft.submittedAt && draft.status === 'in_review' ? (
              <>
                submitted <RelativeTime iso={draft.submittedAt} />
              </>
            ) : (
              <>
                updated <RelativeTime iso={draft.updatedAt} />
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-center text-xs text-gray-400">
          {draft.commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="message" className="h-3.5 w-3.5" />
              {draft.commentCount}
            </span>
          )}
          <Icon name="chevronRight" className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
        </div>
      </Link>
    </li>
  );
}
