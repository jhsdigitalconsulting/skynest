'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/vault-ui/types';
import { useToast } from './Toaster/context';

/**
 * Run a vault server action with consistent UX: pending state, a toast with
 * the outcome, then navigate to the action's `redirectTo` or refresh in place.
 */
export function useVaultAction() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (action: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) => {
      startTransition(async () => {
        let result: ActionResult;
        try {
          result = await action();
        } catch (err) {
          result = { ok: false, error: (err as Error).message || 'Request failed.' };
        }
        if (result.ok) {
          if (result.message) toast.show(result.message, 'success');
          if (result.redirectTo) router.push(result.redirectTo);
          else router.refresh();
        } else {
          toast.show(result.error, 'error');
        }
        onDone?.(result);
      });
    },
    [router, toast],
  );

  return { run, pending };
}
