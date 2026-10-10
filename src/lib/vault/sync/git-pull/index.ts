import { envForVault } from '../../registry';
import type { GitSource } from './types';

export { planPull, summarizePlan } from './plan';
export { applyPull } from './apply';
export { SyncBusyError, readSyncState } from './state';
export type { ApplyOptions, ApplyResult, GitSource, PlanSummary, PullPlan, SyncMode, SyncState } from './types';

/** The Git repo a vault mirrors to, or null when none is configured (so there is nothing to pull from). */
export function getGitSource(vaultId: string): GitSource | null {
  const repo = envForVault('VAULT_REPO', vaultId);
  if (!repo) return null;
  return { repo, branch: envForVault('VAULT_BRANCH', vaultId) ?? 'main' };
}

/**
 * The token to read the repo with: the signed-in user's when they have one,
 * otherwise the deployment's read token (headless callers and webhooks).
 */
export function resolveGitToken(userToken?: string): string {
  const token = userToken || process.env.VAULT_GITHUB_ADMIN_TOKEN;
  if (!token) {
    throw new Error(
      'No GitHub token available to read the repository. Sign in with GitHub, or set VAULT_GITHUB_ADMIN_TOKEN.',
    );
  }
  return token;
}
