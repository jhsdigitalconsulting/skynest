import { auth } from '@/lib/auth';
import { createAuthorizationProvider } from '@/lib/authorization/authorization-factory';
import { isMcpAuthDisabled } from '@/lib/mcp/auth';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { createEngine } from '@/lib/vault/index';
import { createStorageProvider } from '@/lib/vault/storage/index';
import { envForVault, findVault, getDefaultVaultId, listVaults } from '@/lib/vault/registry';
import {
  SyncBusyError,
  applyPull,
  getGitSource,
  planPull,
  readSyncState,
  resolveGitToken,
  summarizePlan,
} from '@/lib/vault/sync/git-pull';
import type { GitSyncHost, HostIdentity, VaultHost } from '@/lib/vault-ui/host';

interface SessionShape {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  idpAccessToken?: string;
  idpLogin?: string;
  idpGroups?: string[];
}

async function identity(): Promise<HostIdentity> {
  const session = (await auth()) as SessionShape | null;
  if (!session) return { status: 'signed_out' };

  const login = session.idpLogin ?? session.user?.email ?? session.user?.name ?? 'unknown';
  const groups = session.idpGroups;

  let access: 'write' | 'read' | 'none';
  if (isMcpAuthDisabled()) {
    access = 'write';
  } else {
    if (!session.idpAccessToken) return { status: 'signed_out' };
    try {
      access = await createAuthorizationProvider().checkAccess({
        idpAccessToken: session.idpAccessToken,
        idpGroups: groups,
      });
    } catch (err) {
      return { status: 'error', message: (err as Error).message };
    }
  }
  if (access === 'none') return { status: 'no_access', login };

  return {
    status: 'ok',
    login,
    name: session.user?.name ?? null,
    image: session.user?.image ?? null,
    access,
    groups,
    userToken: session.idpAccessToken ?? '',
  };
}

async function planFor(vaultId: string, userToken: string) {
  const source = getGitSource(vaultId);
  if (!source) throw new Error('This vault has no Git repository configured.');
  const storage = createStorageProvider(vaultId);
  const token = resolveGitToken(userToken);
  return { storage, token, plan: await planPull(storage, source, token) };
}

const gitSync: GitSyncHost = {
  isConfigured: (vaultId) => getGitSource(vaultId) !== null,
  async plan(vaultId, userToken) {
    return summarizePlan((await planFor(vaultId, userToken)).plan);
  },
  async apply(vaultId, userToken, { prune, actor }) {
    const planned = await planFor(vaultId, userToken);
    return applyPull(planned.storage, planned.plan, planned.token, { mode: 'manual', prune, actor });
  },
  async lastSync(vaultId) {
    const state = await readSyncState(createStorageProvider(vaultId));
    return state ? { syncedAt: state.syncedAt, syncedBy: state.syncedBy } : null;
  },
  isBusyError: (err) => err instanceof SyncBusyError,
};

/** Skynest's implementation of what the vault UI needs from its host. */
export const vaultHost: VaultHost = {
  branding: { name: 'Skynest', homeHref: '/', logoSrc: '/logo.jpg' },
  vaults: { list: listVaults, find: findVault, defaultId: getDefaultVaultId },
  setting: envForVault,
  identity,
  createEngine: (userToken, vaultId) => createEngine(userToken, vaultId),
  SignInPrompt,
  gitSync,
};
