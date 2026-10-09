/**
 * Draft + review workflow types.
 *
 * A draft is a proposed next state of one document, held outside the
 * canonical document tree until a reviewer approves it. Approval writes the
 * draft's content over the document and publishes it through the engine, so
 * the version chain only ever records reviewed content.
 */

/**
 * - `draft`             — being edited; not yet asking for review
 * - `in_review`         — submitted; waiting on a reviewer
 * - `changes_requested` — a reviewer sent it back; the author edits and resubmits
 *
 * There is no `approved` state: approval publishes the document and removes
 * the draft, and the version history records who approved it.
 */
export type DraftStatus = 'draft' | 'in_review' | 'changes_requested';

export const DRAFT_STATUSES: readonly DraftStatus[] = ['draft', 'in_review', 'changes_requested'];

export type DraftActivityKind =
  | 'created'
  | 'edited'
  | 'submitted'
  | 'comment'
  | 'changes_requested'
  | 'withdrawn';

export interface DraftActivity {
  id: string;
  kind: DraftActivityKind;
  actor: string;
  at: string;
  /** Comment text, or the reason given when requesting changes. */
  message?: string;
}

export interface Draft {
  /** Document id the draft targets, e.g. `nodes/api-design`. */
  docId: string;
  /** True when the document did not exist when the draft was started. */
  isNew: boolean;
  /**
   * Published version of the document when the draft was started. Approval
   * refuses (unless forced) when the live document has moved past it, so a
   * reviewer never silently overwrites someone else's newer publish.
   */
  baseVersion: number | null;
  status: DraftStatus;
  /** Denormalized from the content's frontmatter so listings need no parse. */
  title: string;
  /** Full proposed document — frontmatter and body — as markdown. */
  content: string;
  author: string;
  contributors: string[];
  /** Incremented on every content save; used for optimistic concurrency. */
  revision: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  activity: DraftActivity[];
}

/** Lightweight projection of a draft for queues and listings. */
export interface DraftSummary {
  docId: string;
  isNew: boolean;
  baseVersion: number | null;
  status: DraftStatus;
  title: string;
  author: string;
  contributors: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  commentCount: number;
}

/** Field-level edits applied on top of a draft's (or the document's) current state. */
export interface DraftChanges {
  title?: string;
  /** Empty string removes the description. */
  description?: string;
  tags?: string[];
  type?: string;
  body?: string;
}

/** Reviewer-facing identity of whoever is acting. */
export interface ReviewActor {
  login: string;
  isReviewer: boolean;
}

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'not_found'
      | 'invalid_state'
      | 'forbidden'
      | 'conflict'
      | 'stale'
      | 'validation'
      | 'exists',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ReviewError';
  }
}
