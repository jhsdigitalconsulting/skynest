'use client';

import { useState } from 'react';
import { restoreVersionAction } from '@/app/vault/actions';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { buttonClass } from './button-styles';
import { useVaultAction } from './useVaultAction';
import { useVaultId } from './useVault';

interface Props {
  docId: string;
  version: number;
  hasDraft: boolean;
  size?: 'sm' | 'md';
}

export function RestoreVersionButton({ docId, version, hasDraft, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useVaultAction();
  const vaultId = useVaultId();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('secondary', size)}>
        <Icon name="undo" className="h-3.5 w-3.5" />
        Restore
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Restore version ${version}?`}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={buttonClass('ghost')}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => restoreVersionAction(vaultId, docId, version), () => setOpen(false))}
              className={buttonClass('primary')}
            >
              {pending ? 'Restoring…' : 'Start draft from v' + version}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This copies version {version} into a draft and opens it in the editor. Nothing is published until the draft is
          reviewed and approved.
        </p>
        {hasDraft && (
          <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            This document already has a draft — its content will be replaced by version {version}.
          </p>
        )}
      </Dialog>
    </>
  );
}
