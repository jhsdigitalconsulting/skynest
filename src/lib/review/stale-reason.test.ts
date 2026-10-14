import { describe, expect, it } from 'vitest';
import { isDraftStale } from './stale-reason';

describe('isDraftStale', () => {
  it('is never stale when nothing is published', () => {
    expect(isDraftStale({ isNew: true, baseVersion: null }, null)).toBe(false);
    expect(isDraftStale({ isNew: false, baseVersion: 2 }, null)).toBe(false);
  });

  it('flags a new document that someone published meanwhile', () => {
    expect(isDraftStale({ isNew: true, baseVersion: null }, { version: 1 })).toBe(true);
  });

  it('flags an edit whose base is no longer the live version', () => {
    expect(isDraftStale({ isNew: false, baseVersion: 2 }, { version: 3 })).toBe(true);
  });

  it('is fresh when the edit is based on the live version', () => {
    expect(isDraftStale({ isNew: false, baseVersion: 3 }, { version: 3 })).toBe(false);
  });
});
