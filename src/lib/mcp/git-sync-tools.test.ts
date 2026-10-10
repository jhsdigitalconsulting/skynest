import { describe, it, expect, vi, beforeEach } from 'vitest';

const sync = vi.hoisted(() => ({
  getGitSource: vi.fn(),
  planPull: vi.fn(),
  applyPull: vi.fn(),
  summarizePlan: vi.fn(),
  resolveGitToken: vi.fn((t?: string) => t || 'admin'),
  SyncBusyError: class SyncBusyError extends Error {},
}));

const { SyncBusyError } = sync;

vi.mock('@/lib/vault/sync/git-pull', () => sync);
vi.mock('@/lib/vault/storage/index', () => ({ createStorageProvider: vi.fn(() => ({})) }));
vi.mock('./review-tools', () => ({ requireReviewerForDirectWrite: vi.fn(() => null) }));

import { registerGitSyncTool } from './git-sync-tools';
import { requireReviewerForDirectWrite } from './review-tools';

type Handler = (args: { dry_run: boolean; prune: boolean }, ctx: { authInfo: unknown }) => Promise<{ content: { text: string }[]; isError?: boolean }>;
let handler: Handler;

const ctx = (scopes: string[] = ['mcp:write']) => ({
  authInfo: { scopes, extra: { userToken: 'tok', userLogin: 'alice', vaultId: 'v1' } },
});
const body = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
  registerGitSyncTool(((name: string, _d: string, _s: unknown, h: Handler) => {
    expect(name).toBe('sync_from_git');
    handler = h;
  }) as never);
  sync.getGitSource.mockReturnValue({ repo: 'o/r', branch: 'main' });
  sync.planPull.mockResolvedValue({ plan: true });
  sync.summarizePlan.mockReturnValue({ hasChanges: true, counts: {} });
  sync.applyPull.mockResolvedValue({ added: 2 });
});

describe('sync_from_git', () => {
  it('rejects read-only callers', async () => {
    const r = await handler({ dry_run: false, prune: false }, ctx(['mcp:read']));
    expect(r.isError).toBe(true);
    expect(sync.applyPull).not.toHaveBeenCalled();
  });

  it('rejects non-reviewers when review is required', async () => {
    vi.mocked(requireReviewerForDirectWrite).mockReturnValueOnce({ content: [{ type: 'text', text: '{"error":"review"}' }], isError: true });
    const r = await handler({ dry_run: false, prune: false }, ctx());
    expect(r.isError).toBe(true);
    expect(sync.planPull).not.toHaveBeenCalled();
  });

  it('errors clearly when the vault has no repo', async () => {
    sync.getGitSource.mockReturnValue(null);
    const r = await handler({ dry_run: true, prune: false }, ctx());
    expect(r.isError).toBe(true);
    expect(body(r).error).toContain('VAULT_REPO');
  });

  it('dry run plans but never applies', async () => {
    const r = await handler({ dry_run: true, prune: false }, ctx());
    expect(body(r).dry_run).toBe(true);
    expect(sync.applyPull).not.toHaveBeenCalled();
  });

  it('applies in manual mode with the caller as actor and forwards prune', async () => {
    const r = await handler({ dry_run: false, prune: true }, ctx());
    expect(body(r)).toMatchObject({ dry_run: false, added: 2 });
    expect(sync.applyPull).toHaveBeenCalledWith({}, { plan: true }, 'tok', { mode: 'manual', prune: true, actor: 'alice' });
  });

  it('reports a busy lock as a normal error', async () => {
    sync.applyPull.mockRejectedValue(new SyncBusyError('x'));
    const r = await handler({ dry_run: false, prune: false }, ctx());
    expect(r.isError).toBe(true);
    expect(body(r).error).toContain('already running');
  });
});
