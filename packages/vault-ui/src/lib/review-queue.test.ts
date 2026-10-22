import { describe, it, expect } from 'vitest';
import type { DraftSummary } from '../review/types';
import { groupDrafts, nextInReview } from './review-queue';

function draft(docId: string, over: Partial<DraftSummary> = {}): DraftSummary {
  return {
    docId,
    isNew: false,
    baseVersion: 1,
    status: 'in_review',
    title: docId,
    tags: [],
    author: 'alice',
    contributors: ['alice'],
    revision: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    submittedAt: '2026-01-01T00:00:00Z',
    commentCount: 0,
    ...over,
  };
}

const at = (n: number) => `2026-01-0${n}T00:00:00Z`;

describe('groupDrafts', () => {
  it('orders the review tab oldest first and flags stale drafts', () => {
    const drafts = [
      draft('b', { submittedAt: at(3) }),
      draft('a', { submittedAt: at(2) }),
      draft('c', { status: 'draft', submittedAt: null }),
    ];
    const groups = groupDrafts(drafts, 'rita', new Map([['a', { version: 2 }], ['b', { version: 1 }]]));
    expect(groups.review.map((i) => i.docId)).toEqual(['a', 'b']);
    expect(groups.review.map((i) => i.stale)).toEqual([true, false]);
    expect(groups.drafts.map((i) => i.docId)).toEqual(['c']);
    expect(groups.mine).toHaveLength(0);
  });
});

describe('nextInReview', () => {
  const drafts = [
    draft('a', { submittedAt: at(1) }),
    draft('b', { submittedAt: at(2) }),
    draft('c', { submittedAt: at(3) }),
  ];
  it('picks whatever slides into the removed item’s place', () => {
    expect(nextInReview(drafts, 'b')).toBe('c');
    expect(nextInReview(drafts, 'a')).toBe('b');
  });
  it('falls back to the previous item at the end of the queue', () => {
    expect(nextInReview(drafts, 'c')).toBe('b');
  });
  it('skips items removed in the same step', () => {
    expect(nextInReview(drafts, 'a', ['b'])).toBe('c');
    expect(nextInReview(drafts, 'b', ['a', 'c'])).toBeNull();
  });
  it('returns null when nothing is left or the item is not in review', () => {
    expect(nextInReview([draft('a')], 'a')).toBeNull();
    expect(nextInReview(drafts, 'zzz')).toBeNull();
  });
});
