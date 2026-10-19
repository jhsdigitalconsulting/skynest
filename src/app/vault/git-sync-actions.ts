'use server';

import { revalidatePath } from 'next/cache';
import { VaultAuthError, requireVault, requireWriter } from '@/lib/vault-ui/context';
import type { VaultViewer } from '@/lib/vault-ui/context';
import { getVaultHost } from '@/lib/vault-ui/current-host';
import type { ApplyResult, PlanSummary } from '@/lib/vault-ui/git-sync-types';

export type GitSyncStatus =
  | { ok: true; configured: false }
  | { ok: true; configured: true; summary: PlanSummary }
  | { ok: false; error: string };

export type GitSyncPreview =
  | { ok: true; summary: PlanSummary }
  | { ok: false; error: string };

export type GitSyncRun =
  | { ok: true; result: ApplyResult; message: string }
  | { ok: false; error: string };

const STATUS_TTL_MS = 60_000;
const statusCache = new Map<string, { at: number; value: GitSyncStatus }>();

/** Syncing overwrites hosted copies, so it needs the same standing as publishing directly. */
async function requireSyncer(): Promise<VaultViewer> {
  const viewer = await requireWriter();
  if (viewer.reviewRequired && !viewer.isReviewer) {
    throw new VaultAuthError('Only reviewers can sync from Git while review is required.');
  }
  return viewer;
}

function errorMessage(err: unknown): string {
  if (err instanceof VaultAuthError) return err.message;
  if (getVaultHost().gitSync?.isBusyError(err)) return 'Another sync is already running. Try again in a moment.';
  return err instanceof Error ? err.message : 'Something went wrong.';
}

function gitSyncFor(vaultId: string) {
  const gitSync = getVaultHost().gitSync;
  return gitSync?.isConfigured(vaultId) ? gitSync : null;
}

/** Cheap-ish "is Git ahead?" check for the header; cached briefly per vault. */
export async function getGitSyncStatusAction(vaultId: string): Promise<GitSyncStatus> {
  try {
    const viewer = await requireSyncer();
    const vault = requireVault(vaultId);
    const gitSync = gitSyncFor(vault.id);
    if (!gitSync) return { ok: true, configured: false };

    const cached = statusCache.get(vault.id);
    if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.value;

    const value: GitSyncStatus = { ok: true, configured: true, summary: await gitSync.plan(vault.id, viewer.userToken) };
    statusCache.set(vault.id, { at: Date.now(), value });
    return value;
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Fresh plan for the confirm dialog; never cached. */
export async function previewGitSyncAction(vaultId: string): Promise<GitSyncPreview> {
  try {
    const viewer = await requireSyncer();
    const vault = requireVault(vaultId);
    const gitSync = gitSyncFor(vault.id);
    if (!gitSync) return { ok: false, error: 'This vault has no Git repository configured.' };
    return { ok: true, summary: await gitSync.plan(vault.id, viewer.userToken) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Re-plans from scratch so what is applied is what Git and the vault look like now, not what the dialog showed. */
export async function runGitSyncAction(vaultId: string, opts: { prune: boolean }): Promise<GitSyncRun> {
  try {
    const viewer = await requireSyncer();
    const vault = requireVault(vaultId);
    const gitSync = gitSyncFor(vault.id);
    if (!gitSync) return { ok: false, error: 'This vault has no Git repository configured.' };

    const result = await gitSync.apply(vault.id, viewer.userToken, { prune: opts.prune, actor: viewer.login });
    statusCache.delete(vault.id);
    revalidatePath('/vault', 'layout');

    const changed = result.added + result.updated + result.overwritten + result.removed;
    const parts = [`${changed} file${changed === 1 ? '' : 's'} synced from Git`];
    if (result.backedUp) parts.push(`${result.backedUp} replaced copy backed up`);
    if (result.failed.length) parts.push(`${result.failed.length} failed`);
    if (result.affectedDrafts.length) parts.push(`${result.affectedDrafts.length} draft(s) need a rebase`);
    return { ok: true, result, message: parts.join(' · ') };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** When the vault last synced, for the button's tooltip. */
export async function getLastSyncAction(vaultId: string): Promise<{ syncedAt: string; syncedBy: string } | null> {
  try {
    await requireSyncer();
    const gitSync = getVaultHost().gitSync;
    return gitSync ? await gitSync.lastSync(requireVault(vaultId).id) : null;
  } catch {
    return null;
  }
}
