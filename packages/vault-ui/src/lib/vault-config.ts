import 'server-only';
import { cache } from 'react';
import type { NestConfig } from '@promptowl/contextnest-engine';
import { getVaultHost } from './current-host';
import { engineFor, requireViewer } from './context';

/** The vault's .context/config.yaml, or null when it has none or it can't be read. */
export const loadVaultConfig = cache(async (vaultId: string): Promise<NestConfig | null> => {
  try {
    const viewer = await requireViewer();
    return await engineFor(viewer, vaultId).storage.readConfig();
  } catch (err) {
    console.warn(`[vault-ui] could not read the config of vault "${vaultId}":`, (err as Error).message);
    return null;
  }
});

/**
 * The name people see for a vault. The vault's own config name comes first — it
 * travels with the vault and reviewers can change it in Settings. Then the
 * deployment's label (CONTEXTNEST_VAULT_LABEL or CONTEXTNEST_VAULTS), which
 * itself falls back to the id, title-cased.
 */
export const loadVaultName = cache(async (vaultId: string): Promise<string> => {
  const config = await loadVaultConfig(vaultId);
  return config?.name?.trim() || (getVaultHost().vaults.find(vaultId)?.label ?? vaultId);
});
