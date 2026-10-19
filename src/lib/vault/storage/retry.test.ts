import { describe, expect, it, vi } from 'vitest';
import { isTransientBlobError, withBlobRetry } from './retry';

const noSleep = () => Promise.resolve();

describe('isTransientBlobError', () => {
  it('matches rate limiting and 5xx fetch failures', () => {
    expect(isTransientBlobError(new Error('Vercel Blob: Failed to fetch blob: 429 Too Many Requests'))).toBe(true);
    expect(isTransientBlobError(new Error('Vercel Blob: Failed to fetch blob: 500'))).toBe(true);
  });
  it('does not match other failures', () => {
    expect(isTransientBlobError(new Error('Vercel Blob: Failed to fetch blob: 403 Forbidden'))).toBe(false);
    expect(isTransientBlobError(new Error('boom'))).toBe(false);
    expect(isTransientBlobError('429')).toBe(false);
  });
});

describe('withBlobRetry', () => {
  it('returns the first success without waiting', async () => {
    const sleep = vi.fn(noSleep);
    expect(await withBlobRetry(async () => 'ok', sleep)).toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries transient errors until the call succeeds', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Vercel Blob: Failed to fetch blob: 429 Too Many Requests'))
      .mockResolvedValue('ok');
    expect(await withBlobRetry(fn, noSleep)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the last retry', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Vercel Blob: Failed to fetch blob: 500');
    });
    await expect(withBlobRetry(fn, noSleep)).rejects.toThrow('500');
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('does not retry other errors', async () => {
    const fn = vi.fn(async () => {
      throw new Error('nope');
    });
    await expect(withBlobRetry(fn, noSleep)).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
