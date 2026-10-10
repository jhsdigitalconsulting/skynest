import { envForVault } from '@/lib/vault/registry';

/** Top-level folders that hold app bookkeeping rather than content; never shown in the UI. */
const INTERNAL_PREFIXES = ['_sync/', '_drafts/'];

const DEFAULT_ROOT = 'nodes';

/**
 * The folder the browse UI treats as the top of the tree. Git repos carry other
 * top-level things (.github, tests, ...) that are not documents; showing only
 * `nodes` and below keeps the tree about content. Override per vault with
 * `VAULT_UI_ROOT` (or `VAULT_UI_ROOT_<VAULTID>`); set it to `/` to show everything.
 */
export function uiRootFor(vaultId: string): string {
  const raw = (envForVault('VAULT_UI_ROOT', vaultId) ?? DEFAULT_ROOT).trim().replace(/^\/+|\/+$/g, '');
  return raw;
}

export function isInternalPath(id: string): boolean {
  return INTERNAL_PREFIXES.some((p) => id.startsWith(p));
}

/**
 * Documents the browse UI should show. If nothing lives under the root (a vault
 * that does not use that layout) it falls back to everything, so a vault is
 * never rendered empty by this setting.
 */
export function visibleNodes<T extends { id: string }>(nodes: T[], root: string): T[] {
  const content = nodes.filter((n) => !isInternalPath(n.id));
  if (!root) return content;
  const under = content.filter((n) => n.id.startsWith(`${root}/`));
  return under.length > 0 ? under : content;
}

/** The root to strip from the tree and breadcrumbs: the configured one, only when it is actually in use. */
export function effectiveRoot<T extends { id: string }>(nodes: T[], root: string): string {
  return root && nodes.length > 0 && nodes.every((n) => n.id.startsWith(`${root}/`)) ? root : '';
}
