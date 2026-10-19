import Link from 'next/link';
import type { QueueItem } from '../../lib/review-queue';
import { Icon } from '../Icon';
import { RelativeTime } from '../RelativeTime';
import { DraftStatusBadge, NewBadge } from '../StatusBadge';
import { FOCUS_RING, buttonClass } from '../button-styles';

interface Props {
  item: QueueItem;
  href: string;
  active: boolean;
  /** Shows a checkbox for bulk approval. */
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  /** Shows the one-click Approve button. */
  canApprove: boolean;
  busy: boolean;
  onApprove: () => void;
  /** Show the status pill (the Needs review tab only holds one status, so it skips it). */
  showStatus: boolean;
}

/** One compact row in the persistent review list. */
export function QueueRow({ item, href, active, selectable, selected, onToggle, canApprove, busy, onApprove, showStatus }: Props) {
  return (
    <li
      data-docid={item.docId}
      className={`group relative flex items-start gap-2 border-l-2 py-2.5 pl-2 pr-3 transition-colors ${
        active ? 'border-indigo-600 bg-indigo-50' : 'border-transparent hover:bg-gray-50'
      }`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          disabled={item.stale || busy}
          aria-label={`Select ${item.title}`}
          title={item.stale ? 'Out of date. Review it on its own to publish over the newer version.' : undefined}
          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
        />
      )}
      <Link
        href={href}
        scroll={false}
        aria-current={active ? 'page' : undefined}
        className={`min-w-0 flex-1 rounded ${FOCUS_RING}`}
      >
        <span className={`block truncate text-sm font-medium ${active ? 'text-indigo-900' : 'text-gray-900'}`}>{item.title}</span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-gray-500">{item.docId}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{item.author}</span>
          {item.otherContributors > 0 && <span>+{item.otherContributors}</span>}
          <span aria-hidden>·</span>
          <RelativeTime iso={item.status === 'in_review' ? (item.submittedAt ?? item.updatedAt) : item.updatedAt} />
          {item.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Icon name="message" className="h-3 w-3" />
              {item.commentCount}
              <span className="sr-only">comments</span>
            </span>
          )}
        </span>
        {(showStatus || item.isNew || item.stale) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showStatus && <DraftStatusBadge status={item.status} />}
            {item.isNew && <NewBadge />}
            {item.stale && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700">
                <Icon name="alert" className="h-3 w-3" />
                Out of date
              </span>
            )}
          </span>
        )}
      </Link>
      {canApprove && (
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || item.stale}
          title={item.stale ? 'Out of date. Open it to review before publishing.' : 'Approve and publish'}
          aria-label={`Approve and publish ${item.title}`}
          className={`${buttonClass('success', 'sm', 'shrink-0')} lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-visible:opacity-100`}
        >
          <Icon name="check" />
          Approve
        </button>
      )}
    </li>
  );
}
