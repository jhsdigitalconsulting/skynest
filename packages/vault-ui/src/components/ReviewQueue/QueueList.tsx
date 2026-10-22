'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { approveAction, bulkApproveAction } from '../../routes/actions';
import type { PendingSuggestion } from '../../review';
import { NO_FILTERS, activeFilterCount, applyQueueFilters, queueFacets } from '../../lib/queue-filter';
import type { QueueFilters } from '../../lib/queue-filter';
import { QUEUE_TABS } from '../../lib/review-queue';
import type { QueueGroups, QueueItem, QueueTab } from '../../lib/review-queue';
import { EmptyState } from '../EmptyState';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import { RelativeTime } from '../RelativeTime';
import { SuggestionActions } from '../SuggestionActions';
import { FOCUS_RING } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId, useVaultUrls } from '../useVault';
import { BulkBar } from './BulkBar';
import { QueueRow } from './QueueRow';
import { QueueToolbar } from './QueueToolbar';

export type QueueSuggestion = Pick<PendingSuggestion, 'suggestion_id' | 'document_id' | 'title' | 'detected_at'>;

interface Props {
  groups: QueueGroups;
  suggestions: QueueSuggestion[];
  tab: QueueTab;
  /** Document open in the right-hand pane, if any. */
  activeDocId: string | null;
  /** The pane's own preview/changes view, so switching list tabs doesn't reset it. */
  viewTab: 'changes' | 'current' | undefined;
  canWrite: boolean;
  isReviewer: boolean;
}

const TABS: { key: QueueTab; label: string; title: string; icon: IconName }[] = [
  { key: 'review', label: 'Review', title: 'Needs review', icon: 'inbox' },
  { key: 'changes', label: 'Sent back', title: 'Changes requested', icon: 'undo' },
  { key: 'drafts', label: 'Drafts', title: 'Drafts', icon: 'draft' },
  { key: 'mine', label: 'Mine', title: 'Mine', icon: 'user' },
];

const EMPTY: Record<QueueTab, { icon: 'inbox' | 'undo' | 'draft'; title: string; body: string }> = {
  review: { icon: 'inbox', title: 'Nothing waiting for review', body: 'Submitted changes show up here for approval.' },
  changes: { icon: 'undo', title: 'No drafts sent back', body: 'Drafts a reviewer asked to revise appear here.' },
  drafts: { icon: 'draft', title: 'No unsubmitted drafts', body: 'Drafts still being written appear here.' },
  mine: { icon: 'draft', title: 'You don’t have any drafts', body: 'Open a document and choose Edit to start one.' },
};

export function isQueueTab(value: string | null): value is QueueTab {
  return !!value && (QUEUE_TABS as readonly string[]).includes(value);
}

/** The persistent left-hand list: tabs, rows, one-click approve and bulk selection. */
export function QueueList({ groups, suggestions, tab, activeDocId, viewTab, canWrite, isReviewer }: Props) {
  const vaultId = useVaultId();
  const urls = useVaultUrls();
  const router = useRouter();
  const { run, pending } = useVaultAction();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<QueueFilters>(NO_FILTERS);
  const allItems = groups[tab];
  const facets = useMemo(() => queueFacets(allItems), [allItems]);
  // Date ranges are measured from when the list was last recomputed, which is good enough for "last 7 days".
  const items = useMemo(() => applyQueueFilters(allItems, filters, Date.now()), [allItems, filters]);
  const filtered = activeFilterCount(filters) > 0;
  const bulk = isReviewer && canWrite && tab === 'review';

  // Drop selections for items that have been approved or changed status.
  const selected = useMemo(() => items.filter((i) => selectedIds.has(i.docId) && !i.stale), [items, selectedIds]);
  const eligible = useMemo(() => items.filter((i) => !i.stale), [items]);
  const allSelected = eligible.length > 0 && selected.length === eligible.length;

  const toggle = (docId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(docId)) next.add(docId);
      return next;
    });

  // j / k step through the list, like a mail client.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'j' && e.key !== 'k')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('dialog[open]')) return;
      const at = items.findIndex((i) => i.docId === activeDocId);
      const next = items[e.key === 'j' ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0)];
      if (next && next.docId !== activeDocId) {
        router.push(hrefFor(next), { scroll: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activeDocId, tab, viewTab, router]);

  function hrefFor(item: QueueItem) {
    return urls.reviewDraft(item.docId, viewTab, tab);
  }

  const approveOne = (item: QueueItem) =>
    run(() => approveAction(vaultId, item.docId, { expectedRevision: item.revision, current: activeDocId }));

  const approveSelected = (note: string, done: () => void) =>
    run(
      () =>
        bulkApproveAction(
          vaultId,
          selected.map((s) => ({ docId: s.docId, revision: s.revision })),
          { note: note || undefined, current: activeDocId },
        ),
      (r) => {
        if (r.ok) {
          setSelectedIds(new Set());
          done();
        }
      },
    );

  return (
    <>
      <nav className="grid grid-cols-4 border-b border-gray-200" aria-label="Review queue">
        {TABS.map((t) => {
          const on = t.key === tab;
          const href = activeDocId ? urls.reviewDraft(activeDocId, viewTab, t.key) : urls.review(t.key);
          return (
            <Link
              key={t.key}
              href={href}
              scroll={false}
              title={t.title}
              aria-current={on ? 'page' : undefined}
              className={`flex items-center justify-center gap-1.5 border-b-2 px-1 pb-2.5 pt-3 text-xs font-medium ${FOCUS_RING} ${
                on ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${on ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                {groups[t.key].length}
              </span>
            </Link>
          );
        })}
      </nav>

      <QueueToolbar
        filters={filters}
        onChange={setFilters}
        tags={facets.tags}
        authors={facets.authors}
        shown={items.length}
        total={allItems.length}
      />

      {bulk && eligible.length > 0 && (
        <label className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selected.length > 0 && !allSelected;
            }}
            onChange={() => setSelectedIds(allSelected ? new Set() : new Set(eligible.map((i) => i.docId)))}
            disabled={pending}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Select all up-to-date ({eligible.length})
          {eligible.length < items.length && <span className="text-gray-400">· {items.length - eligible.length} out of date</span>}
        </label>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length ? (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <QueueRow
                key={item.docId}
                item={item}
                href={hrefFor(item)}
                active={item.docId === activeDocId}
                selectable={bulk}
                selected={selected.some((s) => s.docId === item.docId)}
                onToggle={() => toggle(item.docId)}
                canApprove={isReviewer && canWrite && item.status === 'in_review'}
                busy={pending}
                onApprove={() => approveOne(item)}
                showStatus={tab !== 'review'}
              />
            ))}
          </ul>
        ) : filtered && allItems.length > 0 ? (
          <div className="p-4">
            <EmptyState icon="search" title="No matches">
              Nothing in this list fits your search and filters.{' '}
              <button type="button" onClick={() => setFilters({ ...NO_FILTERS, sort: filters.sort })} className="font-medium text-indigo-600 hover:underline">
                Clear filters
              </button>
            </EmptyState>
          </div>
        ) : (
          <div className="p-4">
            <EmptyState icon={EMPTY[tab].icon} title={EMPTY[tab].title}>
              {EMPTY[tab].body}
            </EmptyState>
          </div>
        )}

        {tab === 'review' && suggestions.length > 0 && (
          <section className="border-t border-gray-200 px-3 py-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <Icon name="spark" className="h-4 w-4 text-indigo-500" />
              Drift suggestions
              <span className="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-semibold text-gray-600">{suggestions.length}</span>
            </h2>
            <ul className="mt-2 space-y-2">
              {suggestions.map((s) => (
                <li key={s.suggestion_id} className="rounded-lg bg-gray-50 p-2.5 ring-1 ring-gray-200">
                  <Link href={urls.doc(s.document_id)} className="block truncate text-sm text-gray-800 hover:text-indigo-700">
                    {s.title ?? s.document_id}
                  </Link>
                  <RelativeTime iso={s.detected_at} className="text-xs text-gray-500" />
                  <div className="mt-2">
                    <SuggestionActions docId={s.document_id} suggestionId={s.suggestion_id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {bulk ? (
        <BulkBar selected={selected} pending={pending} onClear={() => setSelectedIds(new Set())} onApprove={approveSelected} />
      ) : null}
      <p className="hidden border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-400 lg:block">
        <kbd className="font-sans font-semibold">J</kbd> / <kbd className="font-sans font-semibold">K</kbd> next / previous
      </p>
    </>
  );
}
