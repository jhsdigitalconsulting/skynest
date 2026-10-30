'use client';

import { Icon } from './Icon';
import { ResizeHandle } from './ResizeHandle';
import { FOCUS_RING } from './button-styles';
import { SIDE_WIDTH, useReviewLayout } from './useReviewLayout';

interface Props {
  /** The draft itself: preview, diff or published view. */
  children: React.ReactNode;
  /** Actions and activity. Stacked under the draft below xl; a resizable, collapsible column from xl up. */
  side: React.ReactNode;
}

/** Lays out the review page's draft beside its actions and activity. */
export function DraftPaneLayout({ children, side }: Props) {
  const { layout, setSideOpen, setSideWidth } = useReviewLayout();

  return (
    <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:gap-0">
      <div className="min-w-0 xl:flex-1">{children}</div>

      {layout.sideOpen ? (
        <>
          <ResizeHandle
            className="mx-3 hidden xl:block"
            label="Resize the actions and activity column"
            grows="left"
            width={layout.sideWidth}
            min={SIDE_WIDTH.min}
            max={SIDE_WIDTH.max}
            reset={SIDE_WIDTH.initial}
            onChange={setSideWidth}
          />
          <aside
            className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:w-[var(--side-w)] xl:shrink-0 xl:self-start xl:overflow-y-auto"
            style={{ '--side-w': `${layout.sideWidth}px` } as React.CSSProperties}
          >
            <div className="hidden justify-end xl:flex">
              <button
                type="button"
                onClick={() => setSideOpen(false)}
                title="Hide actions and activity"
                aria-label="Hide actions and activity"
                className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 ${FOCUS_RING}`}
              >
                Hide panel
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </button>
            </div>
            {side}
          </aside>
        </>
      ) : (
        <>
          {/* Collapsed: the actions still show under the draft on small screens, where there's no column to hide. */}
          <aside className="space-y-4 xl:hidden">{side}</aside>
          <button
            type="button"
            onClick={() => setSideOpen(true)}
            title="Show actions and activity"
            aria-label="Show actions and activity"
            className={`ml-3 hidden w-6 shrink-0 self-start rounded-md bg-gray-100 py-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 xl:sticky xl:top-20 xl:flex xl:justify-center ${FOCUS_RING}`}
          >
            <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
          </button>
        </>
      )}
    </div>
  );
}
