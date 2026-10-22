'use client';

import { SORT_OPTIONS, UPDATED_OPTIONS, activeFilterCount, NO_FILTERS } from '../../lib/queue-filter';
import type { QueueFilters, QueueSort, UpdatedRange } from '../../lib/queue-filter';
import { Icon } from '../Icon';
import { FOCUS_RING } from '../button-styles';
import { FilterMenu } from './FilterMenu';

interface Props {
  filters: QueueFilters;
  onChange: (next: QueueFilters) => void;
  tags: string[];
  authors: string[];
  shown: number;
  total: number;
}

const SELECT =
  'h-8 rounded-md bg-white pl-2.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

/** Search box, filters and sort for the review list. */
export function QueueToolbar({ filters, onChange, tags, authors, shown, total }: Props) {
  const set = (patch: Partial<QueueFilters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);

  return (
    <div className="space-y-2 border-b border-gray-100 px-3 py-2.5">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && filters.query) {
              e.preventDefault();
              set({ query: '' });
            }
          }}
          placeholder="Search by name…"
          aria-label="Search the review list by name"
          className="block h-8 w-full rounded-md bg-white pl-8 pr-7 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 hover:ring-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => set({ query: '' })}
            aria-label="Clear search"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 ${FOCUS_RING}`}
          >
            <Icon name="x" className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <FilterMenu label="Tags" options={tags} selected={filters.tags} onChange={(next) => set({ tags: next })} />
        <FilterMenu label="Author" options={authors} selected={filters.authors} onChange={(next) => set({ authors: next })} />
        <select
          value={filters.updated}
          onChange={(e) => set({ updated: e.target.value as UpdatedRange })}
          aria-label="Filter by updated date"
          className={`${SELECT} ${filters.updated !== 'any' ? 'bg-indigo-50 text-indigo-700' : ''}`}
        >
          {UPDATED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value === 'any' ? 'Updated: any time' : o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as QueueSort })}
          aria-label="Sort the review list"
          className={SELECT}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      </div>

      {(count > 0 || filters.sort !== 'default') && (
        <p className="flex items-center justify-between text-xs text-gray-500" aria-live="polite">
          <span>
            {count > 0 ? `Showing ${shown} of ${total}` : `${total} sorted`}
          </span>
          <button
            type="button"
            onClick={() => onChange(count > 0 ? { ...NO_FILTERS, sort: filters.sort } : NO_FILTERS)}
            className={`rounded font-medium text-indigo-600 hover:text-indigo-800 ${FOCUS_RING}`}
          >
            {count > 0 ? 'Clear filters' : 'Reset sort'}
          </button>
        </p>
      )}
    </div>
  );
}
