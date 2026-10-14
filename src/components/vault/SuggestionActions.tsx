'use client';

import { useState } from 'react';
import { approveSuggestionAction, rejectSuggestionAction } from '@/app/vault/actions';
import { NoteDialog } from './NoteDialog';
import { buttonClass } from './button-styles';
import { useVaultAction } from './useVaultAction';
import { useVaultId } from './useVault';

interface Props {
  docId: string;
  suggestionId: string;
}

/** Apply / Dismiss buttons for one drift suggestion in the review queue. */
export function SuggestionActions({ docId, suggestionId }: Props) {
  const vaultId = useVaultId();
  const { run, pending } = useVaultAction();
  const [dialog, setDialog] = useState<'apply' | 'dismiss' | null>(null);

  const apply = (note: string) =>
    run(() => approveSuggestionAction(vaultId, docId, suggestionId, note), (r) => r.ok && setDialog(null));
  const dismiss = (reason: string) =>
    run(() => rejectSuggestionAction(vaultId, docId, suggestionId, reason), (r) => r.ok && setDialog(null));

  return (
    <div className="flex shrink-0 gap-1.5">
      <button type="button" onClick={() => setDialog('dismiss')} disabled={pending} className={buttonClass('ghost', 'sm')}>
        Dismiss
      </button>
      <button type="button" onClick={() => setDialog('apply')} disabled={pending} className={buttonClass('secondary', 'sm')}>
        Apply
      </button>
      <NoteDialog
        open={dialog === 'dismiss'}
        pending={pending}
        title="Dismiss suggestion"
        description="The document stays as it is. The suggestion is archived with your reason."
        label="Reason"
        placeholder="Why doesn’t this change apply?"
        cta="Dismiss suggestion"
        variant="danger"
        required
        onClose={() => setDialog(null)}
        onConfirm={dismiss}
      />
      <NoteDialog
        open={dialog === 'apply'}
        pending={pending}
        title="Apply suggestion"
        description="The suggested change is applied and published straight away as a new version."
        label="Note"
        placeholder="Optional"
        cta="Apply and publish"
        variant="primary"
        onClose={() => setDialog(null)}
        onConfirm={apply}
      />
    </div>
  );
}
