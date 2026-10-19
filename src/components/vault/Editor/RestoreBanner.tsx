'use client';

import { Icon } from '../Icon';
import { RelativeTime } from '../RelativeTime';
import { buttonClass } from '../button-styles';

interface Props {
  savedAt: number;
  onRestore: () => void;
  onDismiss: () => void;
}

/** Offers back unsaved edits that were kept in this browser. */
export function RestoreBanner({ savedAt, onRestore, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900"
    >
      <Icon name="history" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        You have unsaved changes from <RelativeTime iso={new Date(savedAt).toISOString()} /> kept in this browser.
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onDismiss} className={buttonClass('ghost', 'sm')}>
          Discard them
        </button>
        <button type="button" onClick={onRestore} className={buttonClass('secondary', 'sm')}>
          Restore
        </button>
      </div>
    </div>
  );
}
