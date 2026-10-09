import 'server-only';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { createAuthorizationProvider } from '@/lib/authorization/authorization-factory';
import { isMcpAuthDisabled } from '@/lib/mcp/auth';
import { createEngine } from '@/lib/vault/index';
import { findVault } from '@/lib/vault/registry';
import type { VaultInfo } from '@/lib/vault/registry';
import type { VaultEngine } from '@/lib/vault/index';
import { isReviewRequired, isReviewer } from '@/lib/review';
import type { ReviewActor } from '@/lib/review';

export type VaultAccess = 'read' | 'write';

export interface VaultViewer {
  login: string;
  name: string | null;
  image: string | null;
  access: VaultAccess;
  isReviewer: boolean;
  /** Whether non-reviewers' direct writes must go through review (they always do in the UI). */
  reviewRequired: boolean;
  userToken: string;
}

export type VaultSession =
  | { status: 'signed_out' }
  | { status: 'no_access'; login: string }
  | { status: 'error'; message: string }
  | { status: 'ok'; viewer: VaultViewer };

interface SessionShape {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  idpAccessToken?: string;
  idpLogin?: string;
  idpGroups?: string[];
}

/**
 * Resolve who is looking at the vault UI and what they may do. Cached per
 * request so the layout and the page share one authorization round-trip.
 */
export const getVaultSession = cache(async (): Promise<VaultSession> => {
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
    viewer: {
      login,
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
      access,
      isReviewer: access === 'write' && isReviewer(login, groups),
      reviewRequired: isReviewRequired(),
      userToken: session.idpAccessToken ?? '',
    },
  };
});

export class VaultAuthError extends Error {}

/** For pages: the signed-in viewer, or throw (layouts render the sign-in state before pages run). */
export async function requireViewer(): Promise<VaultViewer> {
  const session = await getVaultSession();
  if (session.status !== 'ok') throw new VaultAuthError('Not signed in to the vault.');
  return session.viewer;
}

export async function requireWriter(): Promise<VaultViewer> {
  const viewer = await requireViewer();
  if (viewer.access !== 'write') {
    throw new VaultAuthError('Your account has read-only access to this vault.');
  }
  return viewer;
}

/** The registered vault for a route/action vault id, or throw — never touch an unlisted vault. */
export function requireVault(vaultId: string): VaultInfo {
  const vault = findVault(vaultId);
  if (!vault) throw new VaultAuthError(`Unknown vault "${vaultId}".`);
  return vault;
}

export function engineFor(viewer: VaultViewer, vaultId: string): VaultEngine {
  return createEngine(viewer.userToken, requireVault(vaultId).id);
}

export function actorFor(viewer: VaultViewer): ReviewActor {
  return { login: viewer.login, isReviewer: viewer.isReviewer };
}
