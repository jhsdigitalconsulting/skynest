import { NextRequest, NextResponse, after } from 'next/server';
import { createStorageProvider } from '@/lib/vault/storage/index';
import { envForVault, findVault } from '@/lib/vault/registry';
import { verifyGithubSignature } from '@/lib/webhooks/github/verify';
import { SyncBusyError, applyPull, getGitSource, planPull } from '@/lib/vault/sync/git-pull';

export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ vaultId: string }>;
}

/**
 * GitHub push webhook. Applies only what is safe to apply unattended: files
 * Git added or changed that the vault has not edited since the last sync.
 * Conflicts and deletions are left for a person (the "Sync from Git" button),
 * so nothing is ever silently overwritten.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const vault = findVault((await params).vaultId);
  if (!vault) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const secret = envForVault('GIT_SYNC_WEBHOOK_SECRET', vault.id) ?? '';
  const raw = await req.text();
  if (!verifyGithubSignature(raw, req.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  if (event === 'ping') return NextResponse.json({ ok: true, pong: true });
  if (event !== 'push') return NextResponse.json({ ok: true, ignored: event });

  const source = getGitSource(vault.id);
  if (!source) return NextResponse.json({ error: 'vault has no git repository configured' }, { status: 422 });

  let payload: { ref?: string; repository?: { full_name?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  if (payload.ref !== `refs/heads/${source.branch}`) {
    return NextResponse.json({ ok: true, ignored: `ref ${payload.ref ?? '?'}` });
  }
  if (payload.repository?.full_name && payload.repository.full_name.toLowerCase() !== source.repo.toLowerCase()) {
    return NextResponse.json({ ok: true, ignored: 'different repository' });
  }

  const token = process.env.VAULT_GITHUB_ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'VAULT_GITHUB_ADMIN_TOKEN is not set' }, { status: 500 });

  // GitHub gives up after ~10s: acknowledge now, sync in the background.
  after(async () => {
    try {
      const storage = createStorageProvider(vault.id);
      const plan = await planPull(storage, source, token);
      const result = await applyPull(storage, plan, token, { mode: 'auto', actor: 'github-webhook' });
      console.log(
        `[git-sync] ${vault.id}: +${result.added} ~${result.updated}, held ${result.held.conflict} conflict / ${result.held.remove + result.held.removeConflict} deletion, ${result.failed.length} failed`,
      );
    } catch (err) {
      if (err instanceof SyncBusyError) {
        console.warn(`[git-sync] ${vault.id}: another sync is running; this push will be picked up next time`);
        return;
      }
      console.error(`[git-sync] ${vault.id}: webhook sync failed`, err);
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
