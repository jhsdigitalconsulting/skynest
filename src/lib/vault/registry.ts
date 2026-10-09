/**
 * The vaults this deployment serves.
 *
 * CONTEXTNEST_VAULTS lists them as comma-separated `id:Label` pairs, e.g.
 * `oh:Acme Corp,jhsdc:Product Docs`. When it's unset the
 * deployment serves a single vault, CONTEXTNEST_DEFAULT_VAULT_ID (or
 * "default"), labelled CONTEXTNEST_VAULT_LABEL.
 *
 * Per-vault settings use the same suffix convention as the sync provider:
 * `<KEY>_<VAULT_ID>` (upper-cased, dashes to underscores) wins over `<KEY>`.
 */

export interface VaultInfo {
  id: string;
  label: string;
}

const VAULT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export function validateVaultId(id: string): void {
  if (!VAULT_ID_RE.test(id)) {
    throw new Error(`Invalid vaultId "${id}" — must match ${VAULT_ID_RE}`);
  }
}

/** `<key>_<VAULT_ID>` when set, otherwise `<key>`. */
export function envForVault(key: string, vaultId: string): string | undefined {
  const suffix = vaultId.toUpperCase().replace(/-/g, '_');
  return process.env[`${key}_${suffix}`] ?? process.env[key];
}

function titleCase(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function listVaults(): VaultInfo[] {
  const raw = process.env.CONTEXTNEST_VAULTS?.trim();
  if (!raw) {
    const id = process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
    return [{ id, label: process.env.CONTEXTNEST_VAULT_LABEL ?? titleCase(id) }];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf(':');
      const id = (i === -1 ? entry : entry.slice(0, i)).trim();
      const label = i === -1 ? '' : entry.slice(i + 1).trim();
      validateVaultId(id);
      return { id, label: label || titleCase(id) };
    });
}

/** CONTEXTNEST_DEFAULT_VAULT_ID when it names a listed vault, otherwise the first one listed. */
export function getDefaultVaultId(): string {
  const vaults = listVaults();
  const preferred = process.env.CONTEXTNEST_DEFAULT_VAULT_ID;
  return vaults.find((v) => v.id === preferred)?.id ?? vaults[0].id;
}

export function findVault(id: string): VaultInfo | null {
  return listVaults().find((v) => v.id === id) ?? null;
}
