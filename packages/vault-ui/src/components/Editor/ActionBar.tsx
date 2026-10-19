'use client';

import type { DraftStatus } from '../../review/types';
import { Icon } from '../Icon';
import { buttonClass } from '../button-styles';
import { PAGE_CONTAINER } from '../layout-styles';
import { useShortcutLabel } from '../useShortcutLabel';

interface Props {
  dirty: boolean;
  pending: boolean;
  revision: number | null;
  /** Why the last save failed, shown until the next successful save. */
  error: string | null;
  /** False when there is nothing to submit or publish yet. */
  canSubmit: boolean;
  status: DraftStatus | null;
  isReviewer: boolean;
  canSave: boolean;
  onSave: () => void;
  onSubmit: () => void;
  onPublish: () => void;
  onCancel: () => void;
  onDiscard: (() => void) | null;
  /** Replaces the page container where the bar sits in a pane rather than a full page. */
  containerClass?: string;
}

function statusText(dirty: boolean, revision: number | null, status: DraftStatus | null): string {
  if (dirty) return 'Unsaved changes';
  if (revision === null) return 'No changes yet';
  if (status === 'in_review') return `In review · revision ${revision}`;
  if (status === 'changes_requested') return `Changes requested · revision ${revision}`;
  return `Draft saved · revision ${revision}`;
}

/** Sticky footer with save state and the draft lifecycle actions. */
export function ActionBar(props: Props) {
  const keys = useShortcutLabel();
  const { dirty, pending, revision, status, isReviewer, canSave, canSubmit, error } = props;
  const nothingYet = canSubmit ? undefined : 'Make a change first';
  const inReview = status === 'in_review';
  return (
    <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className={`${props.containerClass ?? PAGE_CONTAINER} flex flex-wrap items-center gap-3 py-3`}>
        {error && !pending ? (
          <p role="alert" className="flex min-w-0 items-center gap-2 text-sm text-red-700">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            <span className="min-w-0">Not saved: {error}</span>
          </p>
        ) : (
          <p aria-live="polite" className={`flex items-center gap-2 text-sm ${dirty ? 'text-amber-700' : 'text-gray-500'}`}>
            <span className={`h-2 w-2 rounded-full ${dirty ? 'bg-amber-500' : revision ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            {pending ? 'Working…' : statusText(dirty, revision, status)}
            <kbd className="ml-1 hidden rounded border border-gray-200 px-1.5 font-mono text-[10px] text-gray-500 sm:inline">{keys('⌘S')}</kbd>
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {props.onDiscard && (
            <button type="button" onClick={props.onDiscard} disabled={pending} title="Discard draft" className={buttonClass('ghost', 'md', 'text-red-600 hover:bg-red-50 hover:text-red-700')}>
              <Icon name="trash" />
              <span className="sr-only sm:not-sr-only">Discard draft</span>
            </button>
          )}
          <button type="button" onClick={props.onCancel} className={buttonClass('ghost')}>
            {dirty ? 'Cancel' : 'Close'}
          </button>
          <button type="button" onClick={props.onSave} disabled={pending || !canSave || !dirty} className={buttonClass('secondary')}>
            Save draft
          </button>
          {!inReview && (
            <button type="button" onClick={props.onSubmit} disabled={pending || !canSave || !canSubmit} title={nothingYet} className={buttonClass(isReviewer ? 'secondary' : 'primary')}>
              <Icon name="send" />
              Submit for review
            </button>
          )}
          {isReviewer && (
            <button type="button" onClick={props.onPublish} disabled={pending || !canSave || !canSubmit} title={nothingYet} className={buttonClass('success')}>
              <Icon name="check" />
              Publish now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
