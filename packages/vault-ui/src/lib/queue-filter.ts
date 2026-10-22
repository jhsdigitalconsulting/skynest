import type { QueueItem } from './review-queue';

export type UpdatedRange = 'any' | '24h' | '7d' | '30d';

/** `default` keeps the order the queue arrives in (oldest submission first on the review tab). */
export type QueueSort = 'default' | 'newest' | 'oldest' | 'title';

export interface QueueFilters {
  query: string;
  tags: string[];
  authors: string[];
  updated: UpdatedRange;
  sort: QueueSort;
}

export const NO_FILTERS: QueueFilters = { query: '', tags: [], authors: [], updated: 'any', sort: 'default' };

export const UPDATED_OPTIONS: { value: UpdatedRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export const SORT_OPTIONS: { value: QueueSort; label: string }[] = [
  { value: 'default', label: 'Queue order' },
  { value: 'newest', label: 'Recently updated' },
  { value: 'oldest', label: 'Least recently updated' },
  { value: 'title', label: 'Name A–Z' },
];

const RANGE_MS: Record<Exclude<UpdatedRange, 'any'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** How many filters are narrowing the list (sort doesn't count: it only reorders). */
export function activeFilterCount(f: QueueFilters): number {
  return (f.query.trim() ? 1 : 0) + (f.tags.length ? 1 : 0) + (f.authors.length ? 1 : 0) + (f.updated !== 'any' ? 1 : 0);
}

/** The tags and authors present in a set of items, for the filter menus. */
export function queueFacets(items: QueueItem[]): { tags: string[]; authors: string[] } {
  const tags = new Map<string, string>();
  const authors = new Map<string, string>();
  for (const item of items) {
    for (const t of item.tags) if (!tags.has(t.toLowerCase())) tags.set(t.toLowerCase(), t);
    if (!authors.has(item.author.toLowerCase())) authors.set(item.author.toLowerCase(), item.author);
  }
  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
  return { tags: [...tags.values()].sort(byName), authors: [...authors.values()].sort(byName) };
}

/** Filter, then sort. `now` is passed in so results don't depend on the clock. */
export function applyQueueFilters(items: QueueItem[], f: QueueFilters, now: number): QueueItem[] {
  const query = f.query.trim().toLowerCase();
  const tags = new Set(f.tags.map((t) => t.toLowerCase()));
  const authors = new Set(f.authors.map((a) => a.toLowerCase()));
  const cutoff = f.updated === 'any' ? null : now - RANGE_MS[f.updated];

  const kept = items.filter((item) => {
    if (query && !item.title.toLowerCase().includes(query) && !item.docId.toLowerCase().includes(query)) return false;
    if (tags.size && !item.tags.some((t) => tags.has(t.toLowerCase()))) return false;
    if (authors.size && !authors.has(item.author.toLowerCase())) return false;
    if (cutoff !== null && new Date(item.updatedAt).getTime() < cutoff) return false;
    return true;
  });

  if (f.sort === 'newest') return [...kept].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (f.sort === 'oldest') return [...kept].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  if (f.sort === 'title') {
    return [...kept].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }
  return kept;
}
