import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StorageProvider } from '@promptowl/contextnest-engine';

const git = vi.hoisted(() => ({
  head: 'head1',
  files: new Map<string, Buffer>(),
  sha: (_b: Buffer) => '',
}));

vi.mock('./github-api', async () => {
  const { gitBlobSha } = await import('./state');
  return {
    fetchBranchHead: vi.fn(async () => git.head),
    fetchTreeShas: vi.fn(async () => new Map([...git.files].map(([p, b]) => [p, gitBlobSha(b)]))),
    fetchBlob: vi.fn(async (_s: unknown, sha: string) => {
      for (const b of git.files.values()) if (gitBlobSha(b) === sha) return b;
      throw new Error(`no blob ${sha}`);
    }),
  };
});

import { planPull, summarizePlan } from './plan';
import { applyPull } from './apply';
import { SyncBusyError, readSyncState } from './state';
import type { GitSource } from './types';

class MemoryStorage implements StorageProvider {
  files = new Map<string, Buffer>();
  async read(p: string) { return this.files.get(p) ?? null; }
  async write(p: string, d: Buffer) { this.files.set(p, d); }
  async delete(p: string) { this.files.delete(p); }
  async deleteDir() {}
  async rename() {}
  async list() { return [...this.files.keys()].sort(); }
  async exists(p: string) { return this.files.has(p); }
  async stat() { return null; }
  async writeExclusive(p: string, d: Buffer) { if (this.files.has(p)) throw new Error('exists'); this.files.set(p, d); }
  async appendOrCreate() {}
  set(p: string, text: string) { this.files.set(p, Buffer.from(text)); }
  text(p: string) { return this.files.get(p)?.toString(); }
}

const source: GitSource = { repo: 'o/r', branch: 'main' };
const buf = (s: string) => Buffer.from(s);
let app: MemoryStorage;

beforeEach(() => {
  app = new MemoryStorage();
  git.files = new Map();
  git.head = 'head1';
});

const run = async (opts: { mode: 'manual' | 'auto'; prune?: boolean }) => {
  const plan = await planPull(app as unknown as StorageProvider, source, 't');
  return { plan, result: await applyPull(app as unknown as StorageProvider, plan, 't', { actor: 'tester', ...opts }) };
};

describe('first sync (no recorded base)', () => {
  it('adds missing files and treats differing ones as conflicts; Git wins and the app copy is backed up', async () => {
    git.files.set('nodes/a.md', buf('git a'));
    git.files.set('nodes/b.md', buf('git b'));
    app.set('nodes/b.md', 'app b');

    const plan = await planPull(app as unknown as StorageProvider, source, 't');
    expect(plan.hasBase).toBe(false);
    expect(plan.add.map((e) => e.path)).toEqual(['nodes/a.md']);
    expect(plan.conflict.map((e) => e.path)).toEqual(['nodes/b.md']);

    const { result } = await run({ mode: 'manual' });
    expect(app.text('nodes/a.md')).toBe('git a');
    expect(app.text('nodes/b.md')).toBe('git b');
    expect(result).toMatchObject({ added: 1, overwritten: 1, backedUp: 1 });
    expect(app.text(`_sync/backup/${result.backupId}/nodes/b.md`)).toBe('app b');
  });

  it('never touches drafts or sync bookkeeping, even when pruning', async () => {
    git.files.set('nodes/a.md', buf('a'));
    app.set('_drafts/xyz.json', '{}');
    app.set('nodes/old.md', 'retired');

    const { result } = await run({ mode: 'manual', prune: true });
    expect(app.files.has('_drafts/xyz.json')).toBe(true);
    expect(app.files.has('nodes/old.md')).toBe(false);
    expect(result.removed).toBe(1);
    expect(app.text(`_sync/backup/${result.backupId}/nodes/old.md`)).toBe('retired'); // no base: always backed up
  });

  it('does not delete anything without prune, and reports what it held back', async () => {
    git.files.set('nodes/a.md', buf('a'));
    app.set('nodes/old.md', 'retired');
    const { result } = await run({ mode: 'manual' });
    expect(app.files.has('nodes/old.md')).toBe(true);
    expect(result.held.remove).toBe(1);
  });
});

describe('after a sync (three-way)', () => {
  beforeEach(async () => {
    git.files.set('nodes/a.md', buf('a1'));
    git.files.set('nodes/b.md', buf('b1'));
    git.files.set('nodes/c.md', buf('c1'));
    await run({ mode: 'manual' });
  });

  it('records the base and then reports nothing to do', async () => {
    const state = await readSyncState(app as unknown as StorageProvider);
    expect(state?.commit).toBe('head1');
    const plan = await planPull(app as unknown as StorageProvider, source, 't');
    expect(summarizePlan(plan)).toMatchObject({ hasChanges: false, needsAttention: false });
    expect(plan.unchanged).toBe(3);
  });

  it('fast-forwards a file Git changed and the app did not touch', async () => {
    git.files.set('nodes/a.md', buf('a2'));
    const { plan, result } = await run({ mode: 'auto' });
    expect(plan.update.map((e) => e.path)).toEqual(['nodes/a.md']);
    expect(result.updated).toBe(1);
    expect(app.text('nodes/a.md')).toBe('a2');
    expect(result.backedUp).toBe(0); // the old copy is exactly what Git already has in history
  });

  it('ignores a file the app edited when Git did not move (its commit is on its way to Git)', async () => {
    app.set('nodes/b.md', 'b-edited-in-app');
    const plan = await planPull(app as unknown as StorageProvider, source, 't');
    expect(plan.conflict).toHaveLength(0);
    expect(plan.update).toHaveLength(0);
    const { result } = await run({ mode: 'manual' });
    expect(app.text('nodes/b.md')).toBe('b-edited-in-app');
    expect(result.overwritten).toBe(0);
  });

  it('treats an app edit that was committed to Git as in sync, not a conflict', async () => {
    app.set('nodes/b.md', 'b2');
    git.files.set('nodes/b.md', buf('b2'));
    const plan = await planPull(app as unknown as StorageProvider, source, 't');
    expect(summarizePlan(plan).hasChanges).toBe(false);
  });

  it('flags a file changed on both sides; auto holds it, manual lets Git win and backs up the app copy', async () => {
    app.set('nodes/c.md', 'c-app');
    git.files.set('nodes/c.md', buf('c-git'));

    const auto = await run({ mode: 'auto' });
    expect(auto.plan.conflict.map((e) => e.path)).toEqual(['nodes/c.md']);
    expect(auto.result.held.conflict).toBe(1);
    expect(app.text('nodes/c.md')).toBe('c-app');

    const manual = await run({ mode: 'manual' });
    expect(app.text('nodes/c.md')).toBe('c-git');
    expect(manual.result.overwritten).toBe(1);
    expect(app.text(`_sync/backup/${manual.result.backupId}/nodes/c.md`)).toBe('c-app');
  });

  it('keeps files created in the app and never prunes them', async () => {
    app.set('nodes/new-in-app.md', 'mine');
    const { plan, result } = await run({ mode: 'manual', prune: true });
    expect(plan.appOnly).toBe(1);
    expect(app.text('nodes/new-in-app.md')).toBe('mine');
    expect(result.removed).toBe(0);
  });

  it('applies a Git deletion only with prune, and only auto-less', async () => {
    git.files.delete('nodes/c.md');
    const auto = await run({ mode: 'auto', prune: true });
    expect(auto.result.removed).toBe(0); // auto never deletes, whatever the flag says
    expect(app.files.has('nodes/c.md')).toBe(true);

    const manual = await run({ mode: 'manual', prune: true });
    expect(manual.result.removed).toBe(1);
    expect(app.files.has('nodes/c.md')).toBe(false);
    expect(manual.result.backedUp).toBe(0); // pristine, still in Git history
  });

  it('backs up a file edited in the app before applying Git deletion of it', async () => {
    git.files.delete('nodes/c.md');
    app.set('nodes/c.md', 'c-edited');
    const { plan, result } = await run({ mode: 'manual', prune: true });
    expect(plan.removeConflict.map((e) => e.path)).toEqual(['nodes/c.md']);
    expect(app.text(`_sync/backup/${result.backupId}/nodes/c.md`)).toBe('c-edited');
  });

  it('skips (auto) a file that changed in the app between plan and write, and backs it up (manual)', async () => {
    git.files.set('nodes/a.md', buf('a2'));
    const plan = await planPull(app as unknown as StorageProvider, source, 't');
    app.set('nodes/a.md', 'edited mid-sync');

    const auto = await applyPull(app as unknown as StorageProvider, plan, 't', { mode: 'auto', actor: 'hook' });
    expect(auto.racedPaths).toEqual(['nodes/a.md']);
    expect(app.text('nodes/a.md')).toBe('edited mid-sync');

    const manual = await applyPull(app as unknown as StorageProvider, plan, 't', { mode: 'manual', actor: 'me' });
    expect(manual.racedPaths).toEqual(['nodes/a.md']);
    expect(app.text('nodes/a.md')).toBe('a2');
    expect(app.text(`_sync/backup/${manual.backupId}/nodes/a.md`)).toBe('edited mid-sync');
  });

  it('reports drafts whose base document was just changed', async () => {
    const { draftPath } = await import('@/lib/review/draft-store');
    app.set(draftPath('nodes/a'), '{}');
    git.files.set('nodes/a.md', buf('a2'));
    const { result } = await run({ mode: 'auto' });
    expect(result.affectedDrafts).toEqual(['nodes/a']);
  });
});

describe('locking', () => {
  it('refuses to run while another sync holds the lease', async () => {
    git.files.set('nodes/a.md', buf('a'));
    app.set('_sync/lock.json', JSON.stringify({ owner: 'someone', expiresAt: Date.now() + 60_000 }));
    await expect(run({ mode: 'manual' })).rejects.toBeInstanceOf(SyncBusyError);
  });

  it('takes over an expired lease and releases its own', async () => {
    git.files.set('nodes/a.md', buf('a'));
    app.set('_sync/lock.json', JSON.stringify({ owner: 'gone', expiresAt: Date.now() - 1 }));
    await run({ mode: 'manual' });
    expect(app.files.has('_sync/lock.json')).toBe(false);
  });
});
