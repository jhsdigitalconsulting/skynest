import { vaultHost } from '@/lib/vault-host';
import type { VaultHost } from './host';

/** The one place the vault UI is joined to the app hosting it. */
export function getVaultHost(): VaultHost {
  return vaultHost;
}
