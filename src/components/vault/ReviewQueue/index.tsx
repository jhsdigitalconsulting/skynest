'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { decodeSegments } from '@/lib/vault-ui/paths';
import type { QueueGroups, QueueTab } from '@/lib/vault-ui/review-queue';
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
 */
export function ReviewQueue({ groups, suggestions, canWrite, isReviewer, children }: ReviewQueueProps) {
  const urls = useVaultUrls();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

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

  return (
    <div className="flex w-full">
      <aside
        className={`${activeDocId ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-gray-200 bg-white lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[22rem] lg:border-r`}
        aria-label="Review queue"
      >
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
      <section className={`${activeDocId ? '' : 'hidden lg:block'} min-w-0 flex-1`}>{children}</section>
    </div>
  );
}
