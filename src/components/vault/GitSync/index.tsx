'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getGitSyncStatusAction,
  previewGitSyncAction,
  runGitSyncAction,
} from '@/app/vault/git-sync-actions';
import type { PlanSummary } from '@/lib/vault/sync/git-pull';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { buttonClass } from '../button-styles';
import { useToast } from '../Toaster/context';
import { Preview } from './Preview';

export interface GitSyncButtonProps {
  vaultId: string;
}

/** Header button: shows when Git is ahead of the vault and pulls it in after a preview. */
export function GitSyncButton({ vaultId }: GitSyncButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [configured, setConfigured] = useState(false);
  const [ahead, setAhead] = useState(false);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<PlanSummary | null>(null);
  const [prune, setPrune] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGitSyncStatusAction(vaultId).then((status) => {
      if (cancelled || !status.ok || !status.configured) return;
      setConfigured(true);
      setAhead(status.summary.needsAttention || status.summary.hasChanges);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  const openDialog = useCallback(() => {
    setOpen(true);
    setSummary(null);
    setLoadError(null);
    setPrune(false);
    previewGitSyncAction(vaultId).then((res) => {
      if (res.ok) setSummary(res.summary);
      else setLoadError(res.error);
    });
  }, [vaultId]);

  const sync = () => {
    startTransition(async () => {
      const res = await runGitSyncAction(vaultId, { prune });
      if (res.ok) {
        toast.show(res.message, res.result.failed.length ? 'error' : 'success');
        setAhead(false);
        setOpen(false);
        router.refresh();
      } else {
        toast.show(res.error, 'error');
      }
    });
  };

  if (!configured) return null;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClass('secondary', 'md', 'relative shrink-0')}
        title={ahead ? 'Git has changes the vault does not' : 'Sync from Git'}
      >
        <Icon name="redo" />
        <span className="hidden lg:inline">Sync from Git</span>
        {ahead && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" aria-label="Git is ahead" />}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sync from Git"
        footer={
          <>
            <button type="button" className={buttonClass('ghost')} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass('primary')}
              disabled={pending || !summary || (!summary.hasChanges && !prune)}
              onClick={sync}
            >
              {pending ? 'Syncing…' : 'Sync now'}
            </button>
          </>
        }
      >
        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : summary ? (
          <Preview summary={summary} prune={prune} onPruneChange={setPrune} />
        ) : (
          <p className="text-sm text-gray-500">Comparing with Git…</p>
        )}
      </Dialog>
    </>
  );
}
