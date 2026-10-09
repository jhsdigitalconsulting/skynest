'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { vaultUrls } from '@/lib/vault-ui/paths';

/** The vault id from the current /vault/<vaultId>/… route. */
export function useVaultId(): string {
  const { vaultId } = useParams<{ vaultId: string }>();
  return decodeURIComponent(vaultId);
}

/** URL helpers bound to the current vault. Stable across renders, so safe as an effect dependency. */
export function useVaultUrls() {
  const vaultId = useVaultId();
  return useMemo(() => vaultUrls(vaultId), [vaultId]);
}
