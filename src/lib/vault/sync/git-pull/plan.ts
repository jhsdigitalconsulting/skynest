import type { StorageProvider } from '@promptowl/contextnest-engine';
import { fetchBranchHead, fetchTreeShas } from './github-api';
import { appFileSha, isAppOnly, listAppFiles, mapPool, readSyncState, safeRelPath } from './state';
import type { GitSource, PlanSummary, PullEntry, PullPlan } from './types';

const READ_CONCURRENCY = 8;
const PATH_CAP = 50;

const byPath = (a: PullEntry, b: PullEntry) => a.path.localeCompare(b.path);

/**
 * Work out what a sync from Git would do, without changing anything.
 *
 * Three-way: for each file we compare Git now (g), the app now (a), and what
 * both agreed on at the last sync (b).
 *   g == b            Git hasn't moved; nothing to pull (the app's own edits are already in Git or on their way)
 *   a == g            already identical
 *   a missing         add
 *   a == b            Git moved, the app didn't: fast-forward
 *   otherwise         both moved: conflict (Git wins, app copy backed up)
 * Before the first sync there is no b, so every differing file is a conflict.
 */
export async function planPull(provider: StorageProvider, source: GitSource, token: string): Promise<PullPlan> {
  const head = await fetchBranchHead(source, token);
  const tree = await fetchTreeShas(source, head, token);
  const state = await readSyncState(provider);
  const base = state?.files ?? null;

  const gitFiles = new Map<string, string>();
  for (const [path, sha] of tree) {
    const safe = safeRelPath(path);
    if (safe && !isAppOnly(safe)) gitFiles.set(safe, sha);
  }

  const appPaths = new Set((await listAppFiles(provider)).filter((p) => !isAppOnly(p)));

  const plan: PullPlan = {
    source,
    head,
    hasBase: base !== null,
    lastSync: state ? { commit: state.commit, at: state.syncedAt, by: state.syncedBy, mode: state.mode } : null,
    add: [],
    update: [],
    conflict: [],
    remove: [],
    removeConflict: [],
    unchanged: 0,
    appOnly: 0,
    gitFiles,
    baseFiles: base,
    agreed: {},
  };

  // Files Git has. With a base, only those Git changed need the app's copy read.
  const toCheck: { path: string; g: string }[] = [];
  for (const [path, g] of gitFiles) {
    if (base && base[path] === g) {
      plan.unchanged++;
      plan.agreed[path] = g;
    } else {
      toCheck.push({ path, g });
    }
  }
  const checked = await mapPool(toCheck, READ_CONCURRENCY, async ({ path, g }) => ({
    path,
    g,
    a: appPaths.has(path) ? await appFileSha(provider, path) : undefined,
  }));
  for (const { path, g, a } of checked) {
    const b = base?.[path];
    const entry: PullEntry = { path, gitSha: g, appSha: a, baseSha: b };
    if (a === g) {
      plan.unchanged++;
      plan.agreed[path] = g;
    } else if (a === undefined) {
      plan.add.push(entry);
    } else if (b !== undefined && a === b) {
      plan.update.push(entry);
    } else {
      plan.conflict.push(entry);
    }
  }

  // Files only the app has.
  const appOnlyPaths = [...appPaths].filter((p) => !gitFiles.has(p));
  if (!base) {
    // No history to say whether Git deleted these or the app created them; the caller's prune choice decides.
    plan.remove.push(...appOnlyPaths.map((path) => ({ path })));
  } else {
    const checkedRemovals = await mapPool(appOnlyPaths, READ_CONCURRENCY, async (path) => ({
      path,
      b: base[path],
      a: base[path] === undefined ? undefined : await appFileSha(provider, path),
    }));
    for (const { path, b, a } of checkedRemovals) {
      if (b === undefined) plan.appOnly++; // created in the app since the last sync
      else if (a === b) plan.remove.push({ path, appSha: a, baseSha: b });
      else plan.removeConflict.push({ path, appSha: a, baseSha: b });
    }
  }

  for (const list of [plan.add, plan.update, plan.conflict, plan.remove, plan.removeConflict]) list.sort(byPath);
  return plan;
}

export function summarizePlan(plan: PullPlan): PlanSummary {
  const cap = (list: PullEntry[]) => list.slice(0, PATH_CAP).map((e) => e.path);
  const needsAttention = plan.conflict.length + plan.remove.length + plan.removeConflict.length > 0;
  return {
    repo: plan.source.repo,
    branch: plan.source.branch,
    head: plan.head,
    hasBase: plan.hasBase,
    lastSync: plan.lastSync,
    counts: {
      add: plan.add.length,
      update: plan.update.length,
      conflict: plan.conflict.length,
      remove: plan.remove.length,
      removeConflict: plan.removeConflict.length,
      unchanged: plan.unchanged,
      appOnly: plan.appOnly,
    },
    paths: {
      add: cap(plan.add),
      update: cap(plan.update),
      conflict: cap(plan.conflict),
      remove: cap(plan.remove),
      removeConflict: cap(plan.removeConflict),
    },
    needsAttention,
    hasChanges: plan.add.length + plan.update.length + plan.conflict.length > 0,
  };
}
