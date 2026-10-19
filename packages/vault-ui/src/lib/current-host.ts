import { vaultHost } from '@vault-ui-host';
import type { VaultHost } from './host';

/** The one place the vault UI is joined to the app hosting it. */
export function getVaultHost(): VaultHost {
  return vaultHost;
}
