import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsStorageProvider, NestStorage } from '@promptowl/contextnest-engine';
import {
  approveDraft,
  commentOnDraft,
  discardDraft,
  getDraft,
  listDrafts,
  requestChanges,
  saveDraft,
  submitDraft,
  withdrawDraft,
  validateNewDocId,
  ReviewError,
  isReviewer,
} from './index';
import type { ReviewActor } from './index';

const author: ReviewActor = { login: 'alice', isReviewer: false };
const reviewer: ReviewActor = { login: 'rita', isReviewer: true };
const outsider: ReviewActor = { login: 'mallory', isReviewer: false };

let dir: string;
let storage: NestStorage;
const sync = { commitFile: vi.fn(async () => {}), deleteFile: vi.fn(async () => {}) };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'skynest-review-'));
  storage = new NestStorage(new FsStorageProvider(dir));
  sync.commitFile.mockClear();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function publishCtx(actor: ReviewActor) {
  return { storage, actor, sync, userToken: 'tok' };
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (err) {
    return err instanceof ReviewError ? err.code : `unexpected: ${(err as Error).message}`;
  }
}

describe('new document draft lifecycle', () => {
  it('saves, submits, approves and publishes', async () => {
    const draft = await saveDraft(
      { storage, actor: author },
      {
        docId: 'nodes/onboarding',
        changes: { title: 'Onboarding', body: 'Welcome aboard.', tags: ['team', '#hr'] },
      },
    );
    expect(draft.isNew).toBe(true);
    expect(draft.status).toBe('draft');
    expect(draft.revision).toBe(1);

    // Drafts are not documents.
    expect(await storage.discoverDocuments()).toHaveLength(0);

    await submitDraft({ storage, actor: author }, 'nodes/onboarding', 'ready');
    const result = await approveDraft(publishCtx(reviewer), 'nodes/onboarding');

    expect(result.version).toBe(1);
    const doc = await storage.readDocument('nodes/onboarding');
    expect(doc.frontmatter.status).toBe('published');
    expect(doc.frontmatter.tags).toEqual(['#team', '#hr']);
    expect(doc.body).toContain('Welcome aboard.');
    expect(await getDraft(storage, 'nodes/onboarding')).toBeNull();
    expect(sync.commitFile).toHaveBeenCalledOnce();

    const history = await storage.readHistory('nodes/onboarding');
    expect(history?.versions.at(-1)?.note).toContain('Approved by rita');
  });

  it('requires a title and a valid path for new documents', async () => {
    expect(await code(saveDraft({ storage, actor: author }, { docId: 'nodes/x', changes: {} }))).toBe(
      'validation',
    );
    expect(
      await code(
        saveDraft({ storage, actor: author }, { docId: 'nodes/../etc', changes: { title: 'x' } }),
      ),
    ).toBe('validation');
    expect(validateNewDocId('_drafts/x')).not.toBeNull();
    expect(validateNewDocId('nodes/api-design')).toBeNull();
  });
});

describe('editing an existing document', () => {
  async function seed() {
    await saveDraft({ storage, actor: reviewer }, { docId: 'nodes/api', changes: { title: 'API', body: 'v1 body' } });
    await submitDraft({ storage, actor: reviewer }, 'nodes/api');
    await approveDraft(publishCtx(reviewer), 'nodes/api');
  }

  it('bases the draft on the published version and bumps on approve', async () => {
    await seed();
    const draft = await saveDraft(
      { storage, actor: author },
      { docId: 'nodes/api', changes: { body: 'v2 body' } },
    );
    expect(draft.isNew).toBe(false);
    expect(draft.baseVersion).toBe(1);

    // Canonical document untouched until approval.
    expect((await storage.readDocument('nodes/api')).body).toContain('v1 body');

    await submitDraft({ storage, actor: author }, 'nodes/api');
    const result = await approveDraft(publishCtx(reviewer), 'nodes/api');
    expect(result.version).toBe(2);
    expect((await storage.readDocument('nodes/api')).body).toContain('v2 body');
  });

  it('refuses a stale approval unless forced', async () => {
    await seed();
    await saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'mine' } });
    await submitDraft({ storage, actor: author }, 'nodes/api');

    // Someone else publishes in the meantime.
    const other = await storage.readDocument('nodes/api');
    other.body = '\nsomeone else\n';
    const { serializeDocument, publishDocument } = await import('@promptowl/contextnest-engine');
    await storage.writeDocument('nodes/api', serializeDocument(other));
    await publishDocument(storage, 'nodes/api', { editedBy: 'bob' });

    expect(await code(approveDraft(publishCtx(reviewer), 'nodes/api'))).toBe('stale');
    const forced = await approveDraft(publishCtx(reviewer), 'nodes/api', { force: true });
    expect(forced.version).toBe(3);
  });

  it('refuses to approve a draft edited after the reviewer opened it', async () => {
    await seed();
    const draft = await saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'reviewed' }, submit: true });
    await saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'sneaky' } });
    expect(
      await code(approveDraft(publishCtx(reviewer), 'nodes/api', { expectedRevision: draft.revision })),
    ).toBe('conflict');
    expect((await storage.readDocument('nodes/api')).body).not.toContain('sneaky');
    const latest = await getDraft(storage, 'nodes/api');
    await approveDraft(publishCtx(reviewer), 'nodes/api', { expectedRevision: latest!.revision });
    expect((await storage.readDocument('nodes/api')).body).toContain('sneaky');
  });

    it('detects concurrent saves via revision', async () => {
    await seed();
    const first = await saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'a' } });
    await saveDraft({ storage, actor: reviewer }, { docId: 'nodes/api', changes: { body: 'b' }, expectedRevision: first.revision });
    expect(
      await code(
        saveDraft({ storage, actor: author }, { docId: 'nodes/api', changes: { body: 'c' }, expectedRevision: first.revision }),
      ),
    ).toBe('conflict');
  });
});

describe('review permissions and transitions', () => {
  beforeEach(async () => {
    await saveDraft({ storage, actor: author }, { docId: 'nodes/p', changes: { title: 'P' } });
  });

  it('only reviewers approve or request changes', async () => {
    await submitDraft({ storage, actor: author }, 'nodes/p');
    expect(await code(approveDraft(publishCtx(author), 'nodes/p'))).toBe('forbidden');
    expect(await code(requestChanges({ storage, actor: author }, 'nodes/p', 'no'))).toBe('forbidden');
  });

  it('cannot approve a draft that was never submitted', async () => {
    expect(await code(approveDraft(publishCtx(reviewer), 'nodes/p'))).toBe('invalid_state');
  });

  it('request changes → edit → resubmit → approve', async () => {
    await submitDraft({ storage, actor: author }, 'nodes/p');
    expect(await code(requestChanges({ storage, actor: reviewer }, 'nodes/p', '  '))).toBe('validation');
    const sentBack = await requestChanges({ storage, actor: reviewer }, 'nodes/p', 'Add an intro');
    expect(sentBack.status).toBe('changes_requested');

    await saveDraft({ storage, actor: author }, { docId: 'nodes/p', changes: { body: 'Intro' } });
    await commentOnDraft({ storage, actor: author }, 'nodes/p', 'Added it');
    const resubmitted = await submitDraft({ storage, actor: author }, 'nodes/p');
    expect(resubmitted.activity.map((a) => a.kind)).toEqual([
      'created',
      'submitted',
      'changes_requested',
      'edited',
      'comment',
      'submitted',
    ]);
    await approveDraft(publishCtx(reviewer), 'nodes/p');
    expect((await storage.readDocument('nodes/p')).frontmatter.status).toBe('published');
  });

  it('freezes in-review drafts to their authors and reviewers', async () => {
    await submitDraft({ storage, actor: author }, 'nodes/p');
    expect(
      await code(saveDraft({ storage, actor: outsider }, { docId: 'nodes/p', changes: { body: 'x' } })),
    ).toBe('forbidden');
    expect(await code(discardDraft({ storage, actor: outsider }, 'nodes/p'))).toBe('forbidden');
    const withdrawn = await withdrawDraft({ storage, actor: author }, 'nodes/p');
    expect(withdrawn.status).toBe('draft');
  });

  it('lists drafts by status and involvement', async () => {
    await saveDraft({ storage, actor: outsider }, { docId: 'nodes/q', changes: { title: 'Q' } });
    await submitDraft({ storage, actor: outsider }, 'nodes/q');
    expect((await listDrafts(storage)).map((d) => d.docId).sort()).toEqual(['nodes/p', 'nodes/q']);
    expect((await listDrafts(storage, { status: 'in_review' })).map((d) => d.docId)).toEqual(['nodes/q']);
    expect((await listDrafts(storage, { involving: 'ALICE' })).map((d) => d.docId)).toEqual(['nodes/p']);
  });

  it('discard removes the draft file only', async () => {
    await discardDraft({ storage, actor: author }, 'nodes/p');
    expect(await getDraft(storage, 'nodes/p')).toBeNull();
    expect(await readdir(join(dir, '_drafts'))).toEqual([]);
  });
});

describe('isReviewer', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('treats every writer as a reviewer when no roles are configured', () => {
    delete process.env.AUTHZ_REVIEWERS;
    delete process.env.AUTHZ_ENTRA_REVIEWER_GROUP_ID;
    expect(isReviewer('anyone')).toBe(true);
  });

  it('matches logins case-insensitively and Entra groups', () => {
    process.env.AUTHZ_REVIEWERS = 'Rita, sam ';
    process.env.AUTHZ_ENTRA_REVIEWER_GROUP_ID = 'g-1';
    expect(isReviewer('rita')).toBe(true);
    expect(isReviewer('SAM')).toBe(true);
    expect(isReviewer('alice')).toBe(false);
    expect(isReviewer('alice', ['g-1'])).toBe(true);
  });
});
