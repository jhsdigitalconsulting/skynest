import { isDraftStale } from '../review/stale-reason';
import type { DraftStatus, DraftSummary } from '../review/types';

export type QueueTab = 'review' | 'changes' | 'drafts' | 'mine';

export const QUEUE_TABS: readonly QueueTab[] = ['review', 'changes', 'drafts', 'mine'];

/** A draft as the review queue list shows it. Plain data, so it can cross to the client. */
export interface QueueItem {
  docId: string;
  title: string;
  status: DraftStatus;
  author: string;
  otherContributors: number;
  isNew: boolean;
  baseVersion: number | null;
  revision: number;
  submittedAt: string | null;
  updatedAt: string;
  commentCount: number;
  /** Approving would overwrite a newer published version. */
  stale: boolean;
}

export type QueueGroups = Record<QueueTab, QueueItem[]>;

/** The queue tab a draft lives under by default. */
export function tabForStatus(status: DraftStatus): QueueTab {
  return status === 'in_review' ? 'review' : status === 'changes_requested' ? 'changes' : 'drafts';
}

function involves(draft: DraftSummary, login: string): boolean {
  const l = login.toLowerCase();
  return draft.author.toLowerCase() === l || draft.contributors.some((c) => c.toLowerCase() === l);
}

function toItem(draft: DraftSummary, published: Map<string, { version: number | null }>): QueueItem {
  return {
    docId: draft.docId,
    title: draft.title || draft.docId,
    status: draft.status,
    author: draft.author,
    otherContributors: draft.contributors.filter((c) => c !== draft.author).length,
    isNew: draft.isNew,
    baseVersion: draft.baseVersion,
    revision: draft.revision,
    submittedAt: draft.submittedAt,
    updatedAt: draft.updatedAt,
    commentCount: draft.commentCount,
    stale: isDraftStale(draft, published.get(draft.docId) ?? null),
  };
}

/** Drafts waiting for review, oldest submission first: the queue is first-come, first-served. */
export function reviewOrder(drafts: DraftSummary[]): DraftSummary[] {
  return drafts
    .filter((d) => d.status === 'in_review')
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
}

/** Split drafts into the four queue tabs, each in its display order. */
export function groupDrafts(
  drafts: DraftSummary[],
  login: string,
  published: Map<string, { version: number | null }>,
): QueueGroups {
  const byRecent = (a: DraftSummary, b: DraftSummary) =>
    (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt);
  const items = (list: DraftSummary[]) => list.map((d) => toItem(d, published));
  return {
    review: items(reviewOrder(drafts)),
    changes: items(drafts.filter((d) => d.status === 'changes_requested').sort(byRecent)),
    drafts: items(drafts.filter((d) => d.status === 'draft').sort(byRecent)),
    mine: items(drafts.filter((d) => involves(d, login)).sort(byRecent)),
  };
}

/**
 * The document a reviewer should land on once `docId` leaves the review queue:
 * whatever slid into its place (or the last item when it was at the end),
 * ignoring any ids in `gone` that are being removed in the same step.
 */
export function nextInReview(drafts: DraftSummary[], docId: string, gone: readonly string[] = []): string | null {
  const queue = reviewOrder(drafts).map((d) => d.docId);
  const at = queue.indexOf(docId);
  if (at === -1) return null;
  const remaining = queue.filter((id) => !gone.includes(id) && id !== docId);
  if (remaining.length === 0) return null;
  const before = queue.slice(0, at).filter((id) => !gone.includes(id)).length;
  return remaining[Math.min(before, remaining.length - 1)];
}
