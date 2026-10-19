/** What the vault UI shows about a Git sync; the host decides how the plan is made and applied. */

export interface PlanSummary {
  repo: string;
  branch: string;
  head: string;
  hasBase: boolean;
  lastSync: { commit: string; at: string; by: string; mode: 'manual' | 'auto' } | null;
  counts: {
    add: number;
    update: number;
    conflict: number;
    remove: number;
    removeConflict: number;
    unchanged: number;
    appOnly: number;
  };
  /** Paths per category, capped so the payload stays small. */
  paths: {
    add: string[];
    update: string[];
    conflict: string[];
    remove: string[];
    removeConflict: string[];
  };
  /** Anything a person should look at: conflicts and deletions. */
  needsAttention: boolean;
  /** Whether a sync would change anything at all (without prune). */
  hasChanges: boolean;
}

export interface ApplyResult {
  head: string;
  added: number;
  updated: number;
  /** Conflicting files overwritten with Git's version. */
  overwritten: number;
  removed: number;
  /** Left alone because they need a person: conflicts/deletions during an auto sync, deletions without prune. */
  held: { conflict: number; remove: number; removeConflict: number };
  /** Files that changed in the app after the plan was made and were left alone (auto) or overwritten (manual). */
  racedPaths: string[];
  /** Where the app's overwritten/deleted copies were saved, when there were any. */
  backupId: string | null;
  backedUp: number;
  failed: { path: string; error: string }[];
  /** Drafts whose base document just changed; approving them is blocked as stale until rebased. */
  affectedDrafts: string[];
}
