'use client';

import { useState } from 'react';
import Link from 'next/link';
import { discardDraftAction, submitDraftAction, withdrawDraftAction } from '@/app/vault/actions';
import type { DraftStatus } from '@/lib/review/types';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { NoteDialog } from '../NoteDialog';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId, useVaultUrls } from '../useVault';

interface Props {
  docId: string;
  status: DraftStatus;
  /** Author, contributor or reviewer — may submit, withdraw and discard. */
  canManage: boolean;
  /** May open the editor (false only for a draft in review someone else owns). */
  canEdit: boolean;
}

/** Edit / submit / withdraw / discard, for the people working on the draft. */
export function AuthorPanel({ docId, status, canManage, canEdit }: Props) {
  const { run, pending } = useVaultAction();
  const vaultId = useVaultId();
  const urls = useVaultUrls();
  const [dialog, setDialog] = useState<'submit' | 'discard' | null>(null);
  const close = () => setDialog(null);
  const full = 'w-full justify-center';

  return (
    <>
      <div className="grid gap-2">
        {canManage && status !== 'in_review' && (
          <button type="button" onClick={() => setDialog('submit')} disabled={pending} className={buttonClass('primary', 'md', full)}>
            <Icon name="send" />
            {status === 'changes_requested' ? 'Resubmit for review' : 'Submit for review'}
          </button>
        )}
        {canEdit && (
          <Link href={urls.edit(docId)} className={buttonClass('secondary', 'md', full)}>
            <Icon name="edit" />
            Edit draft
          </Link>
        )}
        {canManage && status === 'in_review' && (
          <button type="button" onClick={() => run(() => withdrawDraftAction(vaultId, docId))} disabled={pending} className={buttonClass('ghost', 'md', full)}>
            <Icon name="arrowLeft" />
            Withdraw from review
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => setDialog('discard')}
            disabled={pending}
            className={buttonClass('ghost', 'md', `${full} text-red-600 hover:bg-red-50 hover:text-red-700`)}
          >
            <Icon name="trash" />
            Discard draft
          </button>
        )}
      </div>

      <NoteDialog
        open={dialog === 'submit'}
        pending={pending}
        title={status === 'changes_requested' ? 'Resubmit for review' : 'Submit for review'}
        description="A reviewer will be able to approve it or send it back with feedback."
        label="Note for the reviewer (optional)"
        placeholder={status === 'changes_requested' ? 'What did you change in response to the feedback?' : 'What changed and why?'}
        cta="Submit"
        variant="primary"
        onClose={close}
        onConfirm={(note) => run(() => submitDraftAction(vaultId, docId, note || undefined), (r) => r.ok && close())}
      />
      <Dialog
        open={dialog === 'discard'}
        onClose={close}
        title="Discard this draft?"
        description="The proposed changes and their discussion will be deleted. The published document is not affected."
        footer={
          <>
            <button type="button" onClick={close} className={buttonClass('ghost')}>
              Keep it
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => discardDraftAction(vaultId, docId), (r) => r.ok && close())}
              className={buttonClass('danger')}
            >
              Discard draft
            </button>
          </>
        }
      >
        {null}
      </Dialog>
    </>
  );
}
