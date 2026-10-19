import { EmptyState } from '../../../components/EmptyState';

export const metadata = { title: 'Review queue' };

/** The right-hand pane when no draft is selected. The list itself lives in the layout. */
export default function ReviewQueuePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <EmptyState icon="inbox" title="Select an item to review">
        Pick a draft from the list to read it, compare it with the published version, and approve it or send it back.
      </EmptyState>
    </div>
  );
}
