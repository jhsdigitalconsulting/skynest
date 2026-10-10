import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import { verifyGithubSignature } from './verify';

const m = vi.hoisted(() => ({
  planPull: vi.fn(async () => ({ p: 1 })),
  applyPull: vi.fn(async () => ({ added: 1, updated: 0, held: { conflict: 0, remove: 0, removeConflict: 0 }, failed: [] })),
  getGitSource: vi.fn(() => ({ repo: 'o/r', branch: 'main' })),
  after: [] as (() => Promise<void>)[],
}));

vi.mock('next/server', async (orig) => ({ ...(await orig<object>()), after: (fn: () => Promise<void>) => m.after.push(fn) }));
vi.mock('@/lib/vault/storage/index', () => ({ createStorageProvider: vi.fn(() => ({})) }));
vi.mock('@/lib/vault/registry', () => ({
  findVault: (id: string) => (id === 'v1' ? { id: 'v1' } : null),
  envForVault: (k: string) => (k === 'GIT_SYNC_WEBHOOK_SECRET' ? 'shh' : undefined),
}));
vi.mock('@/lib/vault/sync/git-pull', () => ({
  planPull: m.planPull,
  applyPull: m.applyPull,
  getGitSource: m.getGitSource,
  SyncBusyError: class extends Error {},
}));

import { POST } from '../../../app/api/webhooks/github/[vaultId]/route';

const sign = (body: string, secret = 'shh') => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
const send = (vault: string, event: string, payload: object, secret = 'shh') => {
  const body = JSON.stringify(payload);
  const req = new Request('http://x/api/webhooks/github/' + vault, {
    method: 'POST',
    headers: { 'x-github-event': event, 'x-hub-signature-256': sign(body, secret) },
    body,
  });
  return POST(req as never, { params: Promise.resolve({ vaultId: vault }) });
};

beforeEach(() => {
  vi.clearAllMocks();
  m.after.length = 0;
  process.env.VAULT_GITHUB_ADMIN_TOKEN = 'tok';
});

describe('verifyGithubSignature', () => {
  it('accepts a valid signature and rejects tampering, wrong secret and malformed headers', () => {
    const body = '{"a":1}';
    expect(verifyGithubSignature(body, sign(body), 'shh')).toBe(true);
    expect(verifyGithubSignature(body + ' ', sign(body), 'shh')).toBe(false);
    expect(verifyGithubSignature(body, sign(body, 'other'), 'shh')).toBe(false);
    expect(verifyGithubSignature(body, 'sha256=zz', 'shh')).toBe(false);
    expect(verifyGithubSignature(body, null, 'shh')).toBe(false);
    expect(verifyGithubSignature(body, sign(body), '')).toBe(false);
  });
});

describe('github push webhook', () => {
  it('rejects a bad signature', async () => {
    expect((await send('v1', 'push', { ref: 'refs/heads/main' }, 'wrong')).status).toBe(401);
    expect(m.after).toHaveLength(0);
  });

  it('404s an unknown vault', async () => {
    expect((await send('nope', 'push', {})).status).toBe(404);
  });

  it('answers ping', async () => {
    expect((await send('v1', 'ping', {})).status).toBe(200);
  });

  it('ignores pushes to other branches', async () => {
    const res = await send('v1', 'push', { ref: 'refs/heads/feature' });
    expect((await res.json()).ignored).toContain('feature');
    expect(m.after).toHaveLength(0);
  });

  it('accepts a push to the vault branch and syncs in auto mode in the background', async () => {
    const res = await send('v1', 'push', { ref: 'refs/heads/main', repository: { full_name: 'O/R' } });
    expect(res.status).toBe(202);
    expect(m.applyPull).not.toHaveBeenCalled();
    await m.after[0]();
    expect(m.applyPull).toHaveBeenCalledWith({}, { p: 1 }, 'tok', { mode: 'auto', actor: 'github-webhook' });
  });
});
