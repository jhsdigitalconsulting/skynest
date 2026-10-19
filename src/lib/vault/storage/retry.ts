/** Waits between attempts, so a call is tried at most `RETRY_DELAYS_MS.length + 1` times. */
const RETRY_DELAYS_MS = [250, 750, 1500];

/**
 * Whether a Vercel Blob error is worth retrying: rate limiting (429) or a server-side
 * hiccup (5xx). The SDK reports `get()` failures only as a message, so match on that.
 */
export function isTransientBlobError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'BlobServiceRateLimited' || err.name === 'BlobServiceNotAvailable') return true;
  return /Failed to fetch blob: (429|5\d\d)\b/.test(err.message);
}

/**
 * Run a read-only Blob call, retrying transient failures with backoff. Only for idempotent
 * calls (get, head, list) — never writes.
 */
export async function withBlobRetry<T>(
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransientBlobError(err)) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}
