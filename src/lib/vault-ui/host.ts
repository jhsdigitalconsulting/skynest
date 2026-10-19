import type { ComponentType } from 'react';
import type { NestStorage } from '@promptowl/contextnest-engine';
import type { ApplyResult, PlanSummary } from './git-sync-types';

/**
 * Everything the vault UI needs from the app it is mounted in. The UI imports
 * nothing from its host beyond this interface; the host supplies it through
 * `getVaultHost()` (current-host.ts), the one place the two are joined.
 */

export interface VaultInfo {
  id: string;
  label: string;
}

/** Records a file write or delete as an attributed audit-trail entry. Failures are logged, never thrown. */
export interface VaultSyncProvider {
  commitFile(params: {
    path: string;
    content: Buffer;
    message: string;
    editedBy: string;
    userToken?: string;
  }): Promise<void>;

  deleteFile(params: {
    path: string;
    message: string;
    editedBy: string;
    userToken?: string;
  }): Promise<void>;
}

export interface VaultEngine {
  storage: NestStorage;
  sync: VaultSyncProvider;
  userToken: string;
}

export type HostIdentity =
  | { status: 'signed_out' }
  | { status: 'no_access'; login: string }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      login: string;
      name: string | null;
      image: string | null;
      access: 'read' | 'write';
      groups?: string[];
      /** Passed back to `createEngine` and the sync provider so writes are attributed to this person. */
      userToken: string;
    };

export interface SignInPromptProps {
  redirectTo?: string;
  description?: string;
}

/** Optional: mirror a vault from a Git repository. Absent means the UI hides sync. */
export interface GitSyncHost {
  isConfigured(vaultId: string): boolean;
  /** Compare the vault with Git. Throws when the vault has no repository. */
  plan(vaultId: string, userToken: string): Promise<PlanSummary>;
  /** Re-plans from scratch, then applies, so what changes is what Git and the vault look like now. */
  apply(vaultId: string, userToken: string, opts: { prune: boolean; actor: string }): Promise<ApplyResult>;
  lastSync(vaultId: string): Promise<{ syncedAt: string; syncedBy: string } | null>;
  isBusyError(err: unknown): boolean;
}

/** How the hosting app presents itself around the vault UI. */
export interface HostBranding {
  name: string;
  /** Where "back to the app" links go. */
  homeHref: string;
  logoSrc: string;
}

export interface VaultHost {
  branding: HostBranding;
  vaults: {
    list(): VaultInfo[];
    find(vaultId: string): VaultInfo | null;
    defaultId(): string;
  };
  /** A per-vault setting by key (e.g. `VAULT_UI_ROOT`), or undefined when unset. */
  setting(key: string, vaultId: string): string | undefined;
  identity(): Promise<HostIdentity>;
  createEngine(userToken: string, vaultId: string): VaultEngine;
  SignInPrompt: ComponentType<SignInPromptProps>;
  gitSync?: GitSyncHost;
}
