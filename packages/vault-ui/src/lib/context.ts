import 'server-only';
import { cache } from 'react';
import { getVaultHost } from './current-host';
import type { VaultEngine, VaultInfo } from './host';
import { isReviewRequired, isReviewer } from '../review';
import type { ReviewActor } from '../review';

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

/**
 * Resolve who is looking at the vault UI and what they may do. Cached per
 * request so the layout and the page share one authorization round-trip.
 */
export const getVaultSession = cache(async (): Promise<VaultSession> => {
  const identity = await getVaultHost().identity();
  if (identity.status !== 'ok') return identity;

  const { login, groups, access } = identity;
  return {
    status: 'ok',
    viewer: {
      login,
      name: identity.name,
      image: identity.image,
      access,
      isReviewer: access === 'write' && isReviewer(login, groups),
      reviewRequired: isReviewRequired(),
      userToken: identity.userToken,
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
  const vault = getVaultHost().vaults.find(vaultId);
  if (!vault) throw new VaultAuthError(`Unknown vault "${vaultId}".`);
  return vault;
}

export function engineFor(viewer: VaultViewer, vaultId: string): VaultEngine {
  return getVaultHost().createEngine(viewer.userToken, requireVault(vaultId).id);
}

export function actorFor(viewer: VaultViewer): ReviewActor {
  return { login: viewer.login, isReviewer: viewer.isReviewer };
}
