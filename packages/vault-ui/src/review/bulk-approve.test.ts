import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsStorageProvider, NestStorage, publishDocument, serializeDocument } from '@promptowl/contextnest-engine';
import { approveDrafts, getDraft, saveDraft, submitDraft } from './index';
import type { ReviewActor } from './index';

const author: ReviewActor = { login: 'alice', isReviewer: false };
const reviewer: ReviewActor = { login: 'rita', isReviewer: true };

let dir: string;
let storage: NestStorage;
const sync = { commitFile: vi.fn(async () => {}), deleteFile: vi.fn(async () => {}) };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'skynest-bulk-'));
  storage = new NestStorage(new FsStorageProvider(dir));
  sync.commitFile.mockClear();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const ctx = (actor: ReviewActor) => ({ storage, actor, sync, userToken: 'tok' });

async function submitNew(docId: string) {
  const draft = await saveDraft({ storage, actor: author }, { docId, changes: { title: docId, body: `${docId} body` } });
  await submitDraft({ storage, actor: author }, docId);
  return draft.revision + 0;
}

describe('approveDrafts', () => {
  it('publishes every listed draft', async () => {
    const a = await submitNew('nodes/a');
    const b = await submitNew('nodes/b');
    const res = await approveDrafts(ctx(reviewer), [
      { docId: 'nodes/a', revision: a },
      { docId: 'nodes/b', revision: b },
    ]);
    expect(res.approved.map((x) => x.docId)).toEqual(['nodes/a', 'nodes/b']);
    expect(res.skipped).toEqual([]);
    expect(res.failed).toEqual([]);
    expect(await getDraft(storage, 'nodes/a')).toBeNull();
    expect(sync.commitFile).toHaveBeenCalledTimes(2);
  });

  it('skips stale drafts instead of overwriting newer content, and carries on', async () => {
    const seed = await saveDraft({ storage, actor: reviewer }, { docId: 'nodes/api', changes: { title: 'API', body: 'v1' } });
    await submitDraft({ storage, actor: reviewer }, 'nodes/api');
    await approveDrafts(ctx(reviewer), [{ docId: 'nodes/api', revision: seed.revision }]);

    const edit = await saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'mine' } });
    await submitDraft({ storage, actor: author }, 'nodes/api');
    const other = await storage.readDocument('nodes/api');
    other.body = '\nsomeone else\n';
    await storage.writeDocument('nodes/api', serializeDocument(other));
    await publishDocument(storage, 'nodes/api', { editedBy: 'bob' });
    const fresh = await submitNew('nodes/fresh');

    const res = await approveDrafts(ctx(reviewer), [
      { docId: 'nodes/api', revision: edit.revision },
      { docId: 'nodes/fresh', revision: fresh },
    ]);
    expect(res.skipped.map((x) => x.docId)).toEqual(['nodes/api']);
    expect(res.approved.map((x) => x.docId)).toEqual(['nodes/fresh']);
    expect(await getDraft(storage, 'nodes/api')).not.toBeNull();
  });

  it('reports drafts that changed since they were listed as failed', async () => {
    const rev = await submitNew('nodes/a');
    const res = await approveDrafts(ctx(reviewer), [{ docId: 'nodes/a', revision: rev + 1 }]);
    expect(res.approved).toEqual([]);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].docId).toBe('nodes/a');
  });

  it('refuses non-reviewers', async () => {
    const rev = await submitNew('nodes/a');
    const res = await approveDrafts(ctx(author), [{ docId: 'nodes/a', revision: rev }]);
    expect(res.approved).toEqual([]);
    expect(res.failed).toHaveLength(1);
  });
});
