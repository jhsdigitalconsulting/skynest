import type { StorageProvider } from '@promptowl/contextnest-engine';
import { draftPath } from '@/lib/review/draft-store';
import { fetchBlob } from './github-api';
import { SYNC_DIR, acquireLock, appFileSha, mapPool, writeSyncState } from './state';
import type { ApplyOptions, ApplyResult, PullEntry, PullPlan } from './types';

const WRITE_CONCURRENCY = 6;

type Kind = 'add' | 'update' | 'conflict';

/**
 * Apply a plan. Git wins every conflict, but never silently: the app's copy is
 * saved under `_sync/backup/<run>/` first.
 *
 * `auto` (webhooks) only fast-forwards: it adds files and updates ones the app
 * hasn't touched, and leaves conflicts and deletions for a person. `manual`
 * also resolves conflicts in Git's favour and, with `prune`, applies deletions.
 *
 * Every write re-reads the app's copy first. If it changed since the plan was
 * made, an auto sync skips it and a manual sync backs it up before overwriting.
 */
export async function applyPull(
  provider: StorageProvider,
  plan: PullPlan,
  token: string,
  opts: ApplyOptions,
): Promise<ApplyResult> {
  const release = await acquireLock(provider, opts.actor);
  try {
    const runId = new Date().toISOString().replace(/[:.]/g, '-');
    const manual = opts.mode === 'manual';
    const pruning = manual && opts.prune === true;

    const result: ApplyResult = {
      head: plan.head,
      added: 0,
      updated: 0,
      overwritten: 0,
      removed: 0,
      held: { conflict: 0, remove: 0, removeConflict: 0 },
      racedPaths: [],
      backupId: null,
      backedUp: 0,
      failed: [],
      affectedDrafts: [],
    };
    const final: Record<string, string> = { ...plan.agreed };
    const done = new Set<string>();
    const changedDocs = new Set<string>();

    const backup = async (path: string) => {
      const buf = await provider.read(path);
      if (!buf) return;
      await provider.write(`${SYNC_DIR}/backup/${runId}/${path}`, buf);
      result.backupId = runId;
      result.backedUp++;
    };

    const writes: { entry: PullEntry; kind: Kind }[] = [
      ...plan.add.map((entry) => ({ entry, kind: 'add' as const })),
      ...plan.update.map((entry) => ({ entry, kind: 'update' as const })),
      ...(manual ? plan.conflict.map((entry) => ({ entry, kind: 'conflict' as const })) : []),
    ];

    await mapPool(writes, WRITE_CONCURRENCY, async ({ entry, kind }) => {
      const { path } = entry;
      try {
        const current = await appFileSha(provider, path);
        if (current === entry.gitSha) {
          final[path] = entry.gitSha!; // someone already brought it in line
          done.add(path);
          return;
        }
        const raced = current !== entry.appSha;
        if (raced) {
          result.racedPaths.push(path);
          if (!manual) return; // an auto sync never overwrites something it didn't plan for
        }
        if (current !== undefined && (kind === 'conflict' || raced)) await backup(path);
        const content = await fetchBlob(plan.source, entry.gitSha!, token);
        await provider.write(path, content);
        final[path] = entry.gitSha!;
        done.add(path);
        if (kind === 'add') result.added++;
        else if (kind === 'update') result.updated++;
        else result.overwritten++;
        changedDocs.add(path);
      } catch (err) {
        result.failed.push({ path, error: (err as Error).message });
      }
    });

    if (pruning) {
      const removals = [...plan.remove, ...plan.removeConflict];
      await mapPool(removals, WRITE_CONCURRENCY, async (entry) => {
        const { path } = entry;
        try {
          const current = await appFileSha(provider, path);
          if (current !== undefined) {
            // Safe to drop without a copy only when we know it is exactly what Git last had.
            const pristine = entry.baseSha !== undefined && current === entry.baseSha && current === entry.appSha;
            if (!pristine) await backup(path);
            await provider.delete(path);
            result.removed++;
            changedDocs.add(path);
          }
          done.add(path);
        } catch (err) {
          result.failed.push({ path, error: (err as Error).message });
        }
      });
    } else {
      result.held.remove = plan.remove.length;
      result.held.removeConflict = plan.removeConflict.length;
    }
    if (!manual) result.held.conflict = plan.conflict.length;

    // Anything not applied keeps its old base so the next plan sees it as still pending.
    if (plan.baseFiles) {
      for (const list of [plan.add, plan.update, plan.conflict, plan.remove, plan.removeConflict]) {
        for (const { path } of list) {
          if (!done.has(path) && plan.baseFiles[path] !== undefined) final[path] = plan.baseFiles[path];
        }
      }
    }

    await writeSyncState(provider, {
      version: 1,
      commit: plan.head,
      files: final,
      syncedAt: new Date().toISOString(),
      syncedBy: opts.actor,
      mode: opts.mode,
    });

    for (const path of changedDocs) {
      if (!path.endsWith('.md')) continue;
      const docId = path.replace(/\.md$/, '');
      if (await provider.exists(draftPath(docId))) result.affectedDrafts.push(docId);
    }
    result.racedPaths.sort();
    result.affectedDrafts.sort();
    return result;
  } finally {
    await release();
  }
}
