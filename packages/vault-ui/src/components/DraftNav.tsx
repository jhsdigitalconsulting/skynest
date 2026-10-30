'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import { FOCUS_RING } from './button-styles';
import { useQueueOrder } from './useQueueOrder';
import { useVaultUrls } from './useVault';

interface Props {
  docId: string;
}

const LINK = `inline-flex items-center gap-1 rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${FOCUS_RING}`;
const OFF = 'inline-flex cursor-default items-center gap-1 rounded-md px-2 py-1 text-gray-300';

/** Previous / next links that follow the review list exactly as it's filtered and sorted. */
export function DraftNav({ docId }: Props) {
  const urls = useVaultUrls();
  const params = useSearchParams();
  const { ids, tab } = useQueueOrder();
  const at = ids.indexOf(docId);
  if (at === -1 || ids.length < 2) return null;

  const viewParam = params.get('tab');
  const view = viewParam === 'changes' || viewParam === 'current' ? viewParam : undefined;
  const hrefFor = (id: string) => urls.reviewDraft(id, view, tab);
  const prev = at > 0 ? ids[at - 1] : null;
  const next = at < ids.length - 1 ? ids[at + 1] : null;

  return (
    <nav aria-label="Move through the review list" className="ml-auto flex items-center gap-1 text-sm">
      {prev ? (
        <Link href={hrefFor(prev)} scroll={false} title="Previous item (K)" className={LINK}>
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          Previous
        </Link>
      ) : (
        <span aria-hidden className={OFF}>
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          Previous
        </span>
      )}
      <span className="px-1 text-xs tabular-nums text-gray-500" aria-live="polite">
        {at + 1} of {ids.length}
      </span>
      {next ? (
        <Link href={hrefFor(next)} scroll={false} title="Next item (J)" className={LINK}>
          Next
          <Icon name="arrowLeft" className="h-3.5 w-3.5 rotate-180" />
        </Link>
      ) : (
        <span aria-hidden className={OFF}>
          Next
          <Icon name="arrowLeft" className="h-3.5 w-3.5 rotate-180" />
        </span>
      )}
    </nav>
  );
}
