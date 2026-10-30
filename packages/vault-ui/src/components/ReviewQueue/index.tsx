'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { decodeSegments } from '../../lib/paths';
import type { QueueGroups, QueueTab } from '../../lib/review-queue';
import { Icon } from '../Icon';
import { ResizeHandle } from '../ResizeHandle';
import { FOCUS_RING } from '../button-styles';
import { LIST_WIDTH, useReviewLayout } from '../useReviewLayout';
import { useVaultUrls } from '../useVault';
import { QueueList, isQueueTab } from './QueueList';
import type { QueueSuggestion } from './QueueList';

export interface ReviewQueueProps {
  groups: QueueGroups;
  suggestions: QueueSuggestion[];
  canWrite: boolean;
  isReviewer: boolean;
  /** The selected draft (or the "select an item" placeholder), rendered on the server. */
  children: React.ReactNode;
}

/**
 * Two panes: the queue stays mounted on the left while the draft changes on the
 * right. It lives in the review layout, so picking another item never reloads the list.
 * On wide screens the queue can be dragged wider or narrower, or slid away entirely.
 */
export function ReviewQueue({ groups, suggestions, canWrite, isReviewer, children }: ReviewQueueProps) {
  const urls = useVaultUrls();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { layout, setListOpen, setListWidth } = useReviewLayout();

  const prefix = `${urls.root}/review/`;
  const activeDocId = pathname.startsWith(prefix) ? decodeSegments(pathname.slice(prefix.length).split('/')) : null;
  const viewParam = params.get('tab');
  const viewTab = viewParam === 'changes' || viewParam === 'current' ? viewParam : undefined;

  // `list` is the queue tab on a draft; on the bare queue the older `tab` param still works.
  const listParam = params.get('list') ?? (activeDocId ? null : viewParam);
  const activeItemTab: QueueTab | null = activeDocId
    ? (['review', 'changes', 'drafts'] as const).find((t) => groups[t].some((i) => i.docId === activeDocId)) ?? null
    : null;
  const tab: QueueTab = isQueueTab(listParam) ? listParam : (activeItemTab ?? 'review');

  // On wide screens, land on the first item instead of an empty pane.
  const firstId = groups[tab][0]?.docId;
  useEffect(() => {
    if (activeDocId || !firstId || !window.matchMedia('(min-width: 1024px)').matches) return;
    router.replace(urls.reviewDraft(firstId, undefined, tab), { scroll: false });
  }, [activeDocId, firstId, tab, router, urls]);

  // Collapsing only applies from lg up; below that the queue is its own full-width screen.
  const asideShown = activeDocId ? 'hidden lg:flex' : 'flex';
  const asideClass = layout.listOpen ? asideShown : activeDocId ? 'hidden' : 'flex lg:hidden';

  return (
    <div className="flex w-full">
      <aside
        className={`${asideClass} w-full shrink-0 flex-col border-gray-200 bg-white lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[var(--queue-w)]`}
        style={{ '--queue-w': `${layout.listWidth}px` } as React.CSSProperties}
        aria-label="Review queue"
      >
        <div className="hidden items-center justify-between border-b border-gray-100 px-3 py-1.5 lg:flex">
          <span className="text-xs font-semibold text-gray-900">Review list</span>
          <button
            type="button"
            onClick={() => setListOpen(false)}
            title="Hide the review list"
            aria-label="Hide the review list"
            className={`rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 ${FOCUS_RING}`}
          >
            <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
          </button>
        </div>
        <QueueList
          groups={groups}
          suggestions={suggestions}
          tab={tab}
          activeDocId={activeDocId}
          viewTab={viewTab}
          canWrite={canWrite}
          isReviewer={isReviewer}
        />
      </aside>
      {layout.listOpen ? (
        <ResizeHandle
          className="hidden lg:block"
          label="Resize the review list"
          grows="right"
          width={layout.listWidth}
          min={LIST_WIDTH.min}
          max={LIST_WIDTH.max}
          reset={LIST_WIDTH.initial}
          onChange={setListWidth}
        />
      ) : (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          title="Show the review list"
          aria-label="Show the review list"
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] w-6 shrink-0 items-start justify-center border-r border-gray-200 bg-gray-50 pt-4 text-gray-500 hover:bg-gray-100 hover:text-gray-800 lg:flex ${FOCUS_RING}`}
        >
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      )}
      <section className={`${activeDocId ? '' : 'hidden lg:block'} min-w-0 flex-1`}>{children}</section>
    </div>
  );
}
