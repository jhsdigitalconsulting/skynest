'use client';

import { useState } from 'react';
import type { QueueItem } from '@/lib/vault-ui/review-queue';
import { NoteDialog } from '../NoteDialog';
import { buttonClass } from '../button-styles';

interface Props {
  selected: QueueItem[];
  pending: boolean;
  onClear: () => void;
  onApprove: (note: string, done: () => void) => void;
}

/** Pinned to the bottom of the list while anything is selected. */
export function BulkBar({ selected, pending, onClear, onApprove }: Props) {
  const [open, setOpen] = useState(false);
  const count = selected.length;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{count} selected</span>
      <button type="button" onClick={onClear} disabled={pending} className={buttonClass('ghost', 'sm')}>
        Clear
      </button>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className={buttonClass('success', 'sm')}>
        Approve &amp; publish {count}
      </button>
      <NoteDialog
        open={open}
        pending={pending}
        title={`Approve and publish ${count} ${count === 1 ? 'document' : 'documents'}`}
        description="Each draft becomes the published document and a new version is recorded. Drafts edited since you listed them are left alone."
        label="Version note (optional, applied to every document)"
        placeholder="Anything worth recording in the history?"
        cta={`Approve & publish ${count}`}
        variant="success"
        extra={
          <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm text-gray-700 ring-1 ring-gray-200">
            {selected.map((s) => (
              <li key={s.docId} className="truncate">
                {s.title} <span className="font-mono text-xs text-gray-500">{s.docId}</span>
              </li>
            ))}
          </ul>
        }
        onClose={() => setOpen(false)}
        onConfirm={(note) => onApprove(note, () => setOpen(false))}
      />
    </div>
  );
}
