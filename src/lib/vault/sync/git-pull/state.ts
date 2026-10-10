import { createHash } from 'crypto';
import { posix } from 'path';
import type { StorageProvider } from '@promptowl/contextnest-engine';
import type { SyncState } from './types';

/** Storage-only bookkeeping (state, lock, backups). Never mirrored to or from Git. */
export const SYNC_DIR = '_sync';
const STATE_PATH = `${SYNC_DIR}/state.json`;
const LOCK_PATH = `${SYNC_DIR}/lock.json`;
const LOCK_TTL_MS = 5 * 60 * 1000;

/** Paths that live only in the app (pending drafts, sync bookkeeping) and must never be pulled over or pruned. */
const APP_ONLY_PREFIXES = [`${SYNC_DIR}/`, '_drafts/'];

export function isAppOnly(path: string): boolean {
  return APP_ONLY_PREFIXES.some((p) => path.startsWith(p));
}

/** A repo-relative path that is safe to use as a storage key, or null. */
export function safeRelPath(p: string): string | null {
  const normalized = posix.normalize(p);
  if (
    normalized.startsWith('/') ||
    normalized.startsWith('..') ||
    normalized.includes('\0') ||
    normalized.includes('\\')
  ) {
    return null;
  }
  return normalized;
}

/** The sha Git assigns to a file's bytes, so storage content can be compared to a tree entry without downloading. */
export function gitBlobSha(content: Buffer): string {
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

export async function appFileSha(provider: StorageProvider, path: string): Promise<string | undefined> {
  const buf = await provider.read(path);
  return buf ? gitBlobSha(buf) : undefined;
}

/** Every file in the vault, dotfiles (.versions, .github) included. */
export async function listAppFiles(provider: StorageProvider): Promise<string[]> {
  const patterns = ['**/*'];
  // Object stores list every key under a prefix; the filesystem glob skips dot-directories unless asked.
  if ((process.env.CONTEXTNEST_STORAGE ?? 'blob') === 'fs') patterns.push('.*/**/*', '**/.*/**/*');
  const lists = await Promise.all(patterns.map((p) => provider.list(p)));
  return [...new Set(lists.flat())].sort();
}

/** Run `fn` over `items` with at most `limit` in flight, keeping input order. */
export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function readSyncState(provider: StorageProvider): Promise<SyncState | null> {
  const buf = await provider.read(STATE_PATH);
  if (!buf) return null;
  try {
    const state = JSON.parse(buf.toString('utf-8')) as SyncState;
    return state.version === 1 && state.files ? state : null;
  } catch {
    return null;
  }
}

export async function writeSyncState(provider: StorageProvider, state: SyncState): Promise<void> {
  await provider.write(STATE_PATH, Buffer.from(JSON.stringify(state), 'utf-8'));
}

export class SyncBusyError extends Error {
  constructor(public readonly owner: string) {
    super(`A sync is already running (started by ${owner}). Try again in a moment.`);
  }
}

/**
 * Best-effort lease so two syncs don't interleave. Object stores have no
 * compare-and-swap, so two callers in the same instant can both win; the
 * per-file re-check in applyPull is what keeps that window harmless.
 */
export async function acquireLock(provider: StorageProvider, actor: string): Promise<() => Promise<void>> {
  const existing = await provider.read(LOCK_PATH);
  if (existing) {
    try {
      const lock = JSON.parse(existing.toString('utf-8')) as { owner: string; expiresAt: number };
      if (lock.expiresAt > Date.now()) throw new SyncBusyError(lock.owner);
    } catch (err) {
      if (err instanceof SyncBusyError) throw err;
      // Unreadable lock file: treat as stale.
    }
  }
  await provider.write(
    LOCK_PATH,
    Buffer.from(JSON.stringify({ owner: actor, expiresAt: Date.now() + LOCK_TTL_MS }), 'utf-8'),
  );
  return async () => {
    await provider.delete(LOCK_PATH);
  };
}
