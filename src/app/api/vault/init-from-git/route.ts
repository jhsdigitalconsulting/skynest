import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { auth } from '@/lib/auth';
import { createStorageProvider } from '@/lib/vault/storage/index';
import { SyncBusyError, applyPull, getGitSource, planPull } from '@/lib/vault/sync/git-pull';

/**
 * Verify caller is authorized to trigger a vault sync.
 *
 * Accepts either:
 *  1. Active NextAuth session (browser OAuth flow)
 *  2. Authorization: Bearer <VAULT_ADMIN_TOKEN> (headless/curl — compared with
 *     timingSafeEqual to prevent timing attacks)
 *
 * Returns the GitHub token to use for repo access, or null if unauthorized.
 */
async function authorize(req: NextRequest): Promise<{ githubToken: string; actor: string } | null> {
  const session = await auth();
  const sessionGitHubToken = (session as { githubAccessToken?: string } | null)?.githubAccessToken;
  if (sessionGitHubToken) {
    return { githubToken: sessionGitHubToken, actor: session?.user?.email ?? 'session' };
  }

  const adminToken = process.env.VAULT_ADMIN_TOKEN;
  const githubAdminToken = process.env.VAULT_GITHUB_ADMIN_TOKEN;
  if (adminToken && githubAdminToken) {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const provided = Buffer.from(bearer);
    const expected = Buffer.from(adminToken);
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return { githubToken: githubAdminToken, actor: 'admin-token' };
    }
  }

  return null;
}

/**
 * Pull the vault's Git repo into hosted storage. Same engine as the in-app
 * button and the `sync_from_git` MCP tool: Git wins, any differing hosted copy
 * is backed up first, nothing is deleted.
 */
export async function POST(req: NextRequest) {
  const authed = await authorize(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { vaultId?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const vaultId = body.vaultId;
  if (vaultId !== undefined && !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(vaultId)) {
    return NextResponse.json({ error: 'Invalid vaultId' }, { status: 400 });
  }

  const resolvedVaultId = vaultId ?? process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
  const source = getGitSource(resolvedVaultId);
  if (!source) return NextResponse.json({ error: 'VAULT_REPO env var not set' }, { status: 500 });

  const storage = createStorageProvider(vaultId);
  let plan;
  try {
    plan = await planPull(storage, source, authed.githubToken);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  try {
    const result = await applyPull(storage, plan, authed.githubToken, { mode: 'manual', actor: authed.actor });
    return NextResponse.json({
      ok: true,
      repo: source.repo,
      branch: source.branch,
      vaultId: resolvedVaultId,
      imported: result.added + result.updated + result.overwritten,
      failed: result.failed.length,
      skipped: 0,
      errors: result.failed.map((f) => `${f.path}: ${f.error}`),
    });
  } catch (err) {
    if (err instanceof SyncBusyError) return NextResponse.json({ error: 'A sync is already running' }, { status: 409 });
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
