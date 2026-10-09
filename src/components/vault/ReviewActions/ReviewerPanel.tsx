'use client';

import { useState } from 'react';
import { approveAction, requestChangesAction } from '@/app/vault/actions';
import { Icon } from '../Icon';
import { NoteDialog } from '../NoteDialog';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';

interface Props {
  docId: string;
  revision: number;
  /** Explanation when the live document has moved on since the draft started. */
  staleReason: string | null;
}

/** Approve / request changes, for reviewers looking at a draft in review. */
export function ReviewerPanel({ docId, revision, staleReason }: Props) {
  const { run, pending } = useVaultAction();
  const vaultId = useVaultId();
  const [dialog, setDialog] = useState<'approve' | 'changes' | null>(null);
  const [force, setForce] = useState(false);
  const close = () => setDialog(null);

  return (
    <>
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => {
            setForce(false);
            setDialog('approve');
          }}
          disabled={pending}
          className={buttonClass('success', 'md', 'w-full justify-center')}
        >
          <Icon name="check" />
          Approve &amp; publish
        </button>
        <button
          type="button"
          onClick={() => setDialog('changes')}
          disabled={pending}
          className={buttonClass('secondary', 'md', 'w-full justify-center')}
        >
          <Icon name="undo" />
          Request changes
        </button>
      </div>

      <NoteDialog
        open={dialog === 'approve'}
        pending={pending}
        title="Approve and publish"
        description="The draft becomes the published document and a new version is recorded."
        label="Version note (optional)"
        placeholder="Anything worth recording in the history?"
        cta={staleReason && force ? 'Publish anyway' : 'Approve & publish'}
        variant={staleReason && force ? 'danger' : 'success'}
        confirmDisabled={!!staleReason && !force}
        extra={
          staleReason ? (
            <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-900 ring-1 ring-orange-200">
              <p className="flex gap-2">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                {staleReason}
              </p>
              <label className="mt-2 flex items-center gap-2 pl-6 font-medium">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                I understand — publish over the newer version
              </label>
            </div>
          ) : null
        }
        onClose={close}
        onConfirm={(note) => run(() => approveAction(vaultId, docId, { note: note || undefined, force, expectedRevision: revision }), (r) => r.ok && close())}
      />
      <NoteDialog
        open={dialog === 'changes'}
        pending={pending}
        title="Request changes"
        description="The draft goes back to its author with your feedback. They can revise it and resubmit."
        label="What needs to change?"
        placeholder="Be specific — this is what the author (or agent) will act on."
        cta="Send back"
        variant="primary"
        required
        onClose={close}
        onConfirm={(note) => run(() => requestChangesAction(vaultId, docId, note), (r) => r.ok && close())}
      />
    </>
  );
}
