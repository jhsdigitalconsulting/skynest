import { z } from 'zod';
import { createStorageProvider } from '@/lib/vault/storage/index';
import { SyncBusyError, applyPull, getGitSource, planPull, resolveGitToken, summarizePlan } from '@/lib/vault/sync/git-pull';
import { errorResult, getExtra, jsonResult, requireWriteScope, resolveVaultId } from './tool-helpers';
import type { ToolRegistrar } from './tool-helpers';
import { requireReviewerForDirectWrite } from './review-tools';

export function registerGitSyncTool(tool: ToolRegistrar): void {
  tool(
    'sync_from_git',
    "Pull changes from this vault's Git repository into the hosted vault. Git wins: a file changed in Git replaces the hosted copy, and any hosted copy that held different, unsynced work is backed up under _sync/backup first. Documents that exist only in the hosted vault, and drafts, are never touched. Defaults to a dry run that reports what would change; pass dry_run: false to apply. Files deleted in Git are only removed when prune: true.",
    {
      dry_run: z.boolean().optional().default(true).describe('Report what would change without writing (default true)'),
      prune: z.boolean().optional().default(false).describe('Also delete hosted files that Git no longer has (default false)'),
    },
    async ({ dry_run, prune }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const reviewErr = requireReviewerForDirectWrite(ctx.authInfo);
      if (reviewErr) return reviewErr;

      const extra = getExtra(ctx.authInfo);
      const vaultId = resolveVaultId(extra);
      const source = getGitSource(vaultId);
      if (!source) return errorResult(`Vault "${vaultId}" has no Git repository configured (VAULT_REPO).`);

      try {
        const token = resolveGitToken(extra.userToken);
        const storage = createStorageProvider(vaultId);
        const plan = await planPull(storage, source, token);
        const summary = summarizePlan(plan);
        if (dry_run) {
          return jsonResult({
            dry_run: true,
            ...summary,
            message: summary.hasChanges
              ? 'Run again with dry_run: false to apply. Conflicts resolve in favour of Git; the hosted copy is backed up first.'
              : 'Hosted vault is already in sync with Git.',
          });
        }
        const result = await applyPull(storage, plan, token, {
          mode: 'manual',
          prune,
          actor: extra.userLogin || 'mcp',
        });
        return jsonResult({ dry_run: false, repo: source.repo, branch: source.branch, ...result });
      } catch (err) {
        if (err instanceof SyncBusyError) return errorResult('Another sync is already running for this vault. Try again shortly.');
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
