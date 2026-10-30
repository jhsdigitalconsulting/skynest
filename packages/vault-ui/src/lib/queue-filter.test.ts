import { describe, it, expect } from 'vitest';
import type { QueueItem } from './review-queue';
import { NO_FILTERS, activeFilterCount, applyQueueFilters, queueFacets } from './queue-filter';

const NOW = new Date('2026-01-31T12:00:00Z').getTime();

function item(docId: string, over: Partial<QueueItem> = {}): QueueItem {
  return {
    docId,
    title: docId,
    tags: [],
    status: 'in_review',
    author: 'alice',
    otherContributors: 0,
    isNew: false,
    baseVersion: 1,
    revision: 1,
    submittedAt: null,
    updatedAt: '2026-01-30T12:00:00Z',
    commentCount: 0,
    stale: false,
    ...over,
  };
}

const items = [
  item('nodes/api-design', { title: 'API design', tags: ['api', 'Docs'], author: 'alice', updatedAt: '2026-01-30T00:00:00Z' }),
  item('nodes/onboarding', { title: 'Onboarding', tags: ['hr'], author: 'Bob', updatedAt: '2026-01-10T00:00:00Z' }),
  item('skills/review', { title: 'Zebra skill', tags: ['docs'], author: 'bob', updatedAt: '2025-11-01T00:00:00Z' }),
];

const ids = (list: QueueItem[]) => list.map((i) => i.docId);

describe('applyQueueFilters', () => {
  it('returns everything in queue order when nothing is set', () => {
    expect(ids(applyQueueFilters(items, NO_FILTERS, NOW))).toEqual(ids(items));
  });

  it('searches title and doc id, ignoring case', () => {
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, query: ' API ' }, NOW))).toEqual(['nodes/api-design']);
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, query: 'skills/' }, NOW))).toEqual(['skills/review']);
  });

  it('matches any selected tag, ignoring case', () => {
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, tags: ['DOCS'] }, NOW))).toEqual(['nodes/api-design', 'skills/review']);
  });

  it('matches any selected author, ignoring case', () => {
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, authors: ['BOB'] }, NOW))).toEqual(['nodes/onboarding', 'skills/review']);
  });

  it('limits by how recently the draft was updated', () => {
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, updated: '7d' }, NOW))).toEqual(['nodes/api-design']);
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, updated: '30d' }, NOW))).toEqual(['nodes/api-design', 'nodes/onboarding']);
  });

  it('combines filters with AND', () => {
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, tags: ['docs'], authors: ['bob'] }, NOW))).toEqual(['skills/review']);
  });

  it('sorts without mutating the input', () => {
    const before = ids(items);
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, sort: 'newest' }, NOW))).toEqual(['nodes/api-design', 'nodes/onboarding', 'skills/review']);
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, sort: 'oldest' }, NOW))).toEqual(['skills/review', 'nodes/onboarding', 'nodes/api-design']);
    expect(ids(applyQueueFilters(items, { ...NO_FILTERS, sort: 'title' }, NOW))).toEqual(['nodes/api-design', 'nodes/onboarding', 'skills/review']);
    expect(ids(items)).toEqual(before);
  });
});

describe('queueFacets', () => {
  it('lists each tag and author once, case-insensitively, sorted', () => {
    expect(queueFacets(items)).toEqual({ tags: ['api', 'Docs', 'hr'], authors: ['alice', 'Bob'] });
  });
});

describe('activeFilterCount', () => {
  it('counts narrowing filters but not sort', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, sort: 'title' })).toBe(0);
    expect(activeFilterCount({ query: 'x', tags: ['a'], authors: ['b'], updated: '7d', sort: 'newest' })).toBe(4);
  });
});
