export interface GitSource {
  repo: string;   // "owner/repo"
  branch: string;
}

/** What the last successful sync left behind, kept in storage so the next one can tell who changed what. */
export interface SyncState {
  version: 1;
  /** Git commit the vault was last reconciled with. */
  commit: string;
  /** path -> git blob sha the app and Git agreed on at the last sync. */
  files: Record<string, string>;
  syncedAt: string;
  syncedBy: string;
  mode: SyncMode;
}

export type SyncMode = 'manual' | 'auto';

export interface PullEntry {
  path: string;
  gitSha?: string;
  appSha?: string;
  baseSha?: string;
}

export interface PullPlan {
  source: GitSource;
  head: string;
  /** False on the first sync: without a recorded base, differing files can't be told apart from conflicts. */
  hasBase: boolean;
  lastSync: { commit: string; at: string; by: string; mode: SyncMode } | null;
  /** In Git, missing from the app. */
  add: PullEntry[];
  /** Changed in Git, untouched in the app since the last sync (fast-forward). */
  update: PullEntry[];
  /** Changed on both sides. Git wins; the app's copy is backed up first. */
  conflict: PullEntry[];
  /** Deleted in Git, untouched in the app. Applied only with prune. */
  remove: PullEntry[];
  /** Deleted in Git but edited in the app. Applied only with prune; backed up first. */
  removeConflict: PullEntry[];
  unchanged: number;
  /** Files only the app has (new since the last sync), which a sync never touches. */
  appOnly: number;
  /** Internal (stripped by summarizePlan): Git's full path -> sha listing at `head`. */
  gitFiles: Map<string, string>;
  /** Internal: the recorded base, or null before the first sync. */
  baseFiles: Record<string, string> | null;
  /** Internal: paths where app and Git are known to agree, with the shared sha. */
  agreed: Record<string, string>;
}

export interface ApplyOptions {
  mode: SyncMode;
  /** Also apply deletions. Manual only. */
  prune?: boolean;
  /** Who is syncing, for the state record and the lock. */
  actor: string;
}

export type { ApplyResult, PlanSummary } from '@/lib/vault-ui/git-sync-types';
