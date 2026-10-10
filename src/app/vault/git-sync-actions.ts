'use server';

import { revalidatePath } from 'next/cache';
import { VaultAuthError, requireVault, requireWriter } from '@/lib/vault-ui/context';
import type { VaultViewer } from '@/lib/vault-ui/context';
import { createStorageProvider } from '@/lib/vault/storage/index';
import {
  SyncBusyError,
  applyPull,
  getGitSource,
  planPull,
  readSyncState,
  resolveGitToken,
  summarizePlan,
} from '@/lib/vault/sync/git-pull';
import type { ApplyResult, PlanSummary } from '@/lib/vault/sync/git-pull';

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
  if (err instanceof SyncBusyError) return 'Another sync is already running. Try again in a moment.';
  return err instanceof Error ? err.message : 'Something went wrong.';
}

async function plan(viewer: VaultViewer, vaultId: string) {
  const vault = requireVault(vaultId);
  const source = getGitSource(vault.id);
  if (!source) return null;
  const storage = createStorageProvider(vault.id);
  const token = resolveGitToken(viewer.userToken);
  return { vault, storage, token, plan: await planPull(storage, source, token) };
}

/** Cheap-ish "is Git ahead?" check for the header; cached briefly per vault. */
export async function getGitSyncStatusAction(vaultId: string): Promise<GitSyncStatus> {
  try {
    const viewer = await requireSyncer();
    const vault = requireVault(vaultId);
    if (!getGitSource(vault.id)) return { ok: true, configured: false };

    const cached = statusCache.get(vault.id);
    if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.value;

    const planned = await plan(viewer, vaultId);
    const value: GitSyncStatus = planned
      ? { ok: true, configured: true, summary: summarizePlan(planned.plan) }
      : { ok: true, configured: false };
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
    const planned = await plan(viewer, vaultId);
    if (!planned) return { ok: false, error: 'This vault has no Git repository configured.' };
    return { ok: true, summary: summarizePlan(planned.plan) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Re-plans from scratch so what is applied is what Git and the vault look like now, not what the dialog showed. */
export async function runGitSyncAction(vaultId: string, opts: { prune: boolean }): Promise<GitSyncRun> {
  try {
    const viewer = await requireSyncer();
    const planned = await plan(viewer, vaultId);
    if (!planned) return { ok: false, error: 'This vault has no Git repository configured.' };

    const result = await applyPull(planned.storage, planned.plan, planned.token, {
      mode: 'manual',
      prune: opts.prune,
      actor: viewer.login,
    });
    statusCache.delete(planned.vault.id);
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
    const state = await readSyncState(createStorageProvider(requireVault(vaultId).id));
    return state ? { syncedAt: state.syncedAt, syncedBy: state.syncedBy } : null;
  } catch {
    return null;
  }
}
