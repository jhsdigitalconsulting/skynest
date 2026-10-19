// The host app aliases this module to its own VaultHost implementation.
declare module '@vault-ui-host' {
  import type { VaultHost } from './src/lib/host';
  export const vaultHost: VaultHost;
}
