import { randomUUID } from 'node:crypto';
import {
  DocumentNotFoundError,
  listSuggestions,
  parseDocument,
  publishDocument,
  serializeDocument,
  validateDocument,
} from '@promptowl/contextnest-engine';
import type {
  ContextNode,
  Frontmatter,
  NestStorage,
  SuggestionMeta,
} from '@promptowl/contextnest-engine';
import type { VaultSyncProvider } from '@/lib/vault/sync/vault-sync-provider';
import {
  deleteDraft,
  listDraftRecords,
  normalizeDocId,
  readDraft,
  summarizeDraft,
  writeDraft,
} from './draft-store';
import { ReviewError } from './types';
import type {
  Draft,
  DraftActivity,
  DraftActivityKind,
  DraftChanges,
  DraftStatus,
  DraftSummary,
  ReviewActor,
} from './types';

export interface WorkflowContext {
  storage: NestStorage;
  actor: ReviewActor;
}

export interface PublishContext extends WorkflowContext {
  sync: VaultSyncProvider;
  userToken: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;

/**
 * Doc ids become storage keys and URLs, so new ones are held to a tight shape:
 * lowercase-ish path segments, no dot/underscore-prefixed (reserved) folders,
 * no traversal.
 */
export function validateNewDocId(docId: string): string | null {
  if (!docId) return 'A document path is required.';
  if (docId.length > 200) return 'The document path is too long (max 200 characters).';
  const segments = docId.split('/');
  for (const seg of segments) {
    if (!SEGMENT.test(seg) || seg === '..' || seg.endsWith('.')) {
      return `"${seg || '(empty)'}" is not a valid path segment. Use letters, numbers, dashes, dots and underscores, and don't start a segment with "." or "_".`;
    }
  }
  if (docId === 'CONTEXT' || docId === 'INDEX') return `"${docId}" is a reserved name.`;
  return null;
}

function now(): string {
  return new Date().toISOString();
}

function activity(kind: DraftActivityKind, actor: string, message?: string): DraftActivity {
  return { id: randomUUID(), kind, actor, at: now(), ...(message ? { message } : {}) };
}

function normalizeTags(tags: string[]): string[] | undefined {
  const cleaned = Array.from(
    new Set(
      tags
        .map((t) => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
        .map((t) => `#${t}`),
    ),
  );
  return cleaned.length ? cleaned : undefined;
}

export async function readDocumentOrNull(
  storage: NestStorage,
  docId: string,
): Promise<ContextNode | null> {
  try {
    return await storage.readDocument(docId);
  } catch (err) {
    if (err instanceof DocumentNotFoundError) return null;
    throw err;
  }
}

function parseDraftContent(docId: string, content: string): ContextNode {
  return parseDocument(`${docId}.md`, content, docId);
}

function assertValid(node: ContextNode): void {
  const result = validateDocument(node);
  if (!result.valid) {
    throw new ReviewError(
      `Validation failed: ${result.errors.map((e) => e.message).join('; ')}`,
      'validation',
      result.errors,
    );
  }
}

function applyChanges(node: ContextNode, changes: DraftChanges): ContextNode {
  const frontmatter: Frontmatter = { ...node.frontmatter };
  if (changes.title !== undefined) frontmatter.title = changes.title.trim();
  if (changes.description !== undefined) {
    const d = changes.description.trim();
    if (d) frontmatter.description = d;
    else delete frontmatter.description;
  }
  if (changes.tags !== undefined) {
    const tags = normalizeTags(changes.tags);
    if (tags) frontmatter.tags = tags;
    else delete frontmatter.tags;
  }
  if (changes.type !== undefined) frontmatter.type = changes.type as Frontmatter['type'];
  const body =
    changes.body !== undefined ? `\n${changes.body.replace(/^\n+|\s+$/g, '')}\n` : node.body;
  return { ...node, frontmatter, body };
}

function canManage(draft: Draft, actor: ReviewActor): boolean {
  const login = actor.login.toLowerCase();
  return (
    actor.isReviewer ||
    draft.author.toLowerCase() === login ||
    draft.contributors.some((c) => c.toLowerCase() === login)
  );
}

async function requireDraft(storage: NestStorage, docId: string): Promise<Draft> {
  const draft = await readDraft(storage.provider, normalizeDocId(docId));
  if (!draft) throw new ReviewError(`No draft exists for "${docId}".`, 'not_found');
  return draft;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getDraft(storage: NestStorage, docId: string): Promise<Draft | null> {
  return readDraft(storage.provider, normalizeDocId(docId));
}

export interface ListDraftsFilter {
  status?: DraftStatus;
  /** Only drafts this login authored or contributed to. */
  involving?: string;
}

export async function listDrafts(
  storage: NestStorage,
  filter: ListDraftsFilter = {},
): Promise<DraftSummary[]> {
  let drafts = await listDraftRecords(storage.provider);
  if (filter.status) drafts = drafts.filter((d) => d.status === filter.status);
  if (filter.involving) {
    const login = filter.involving.toLowerCase();
    drafts = drafts.filter(
      (d) =>
        d.author.toLowerCase() === login || d.contributors.some((c) => c.toLowerCase() === login),
    );
  }
  return drafts.map(summarizeDraft);
}

export interface PendingSuggestion extends SuggestionMeta {
  title?: string;
}

/**
 * Drift suggestions staged anywhere in the vault. A suggestion lives at
 * `{docDir}/_suggestions/{docName}/{id}.meta.yaml`; archived ones sit under an
 * `_archive/` segment and are skipped.
 */
export async function listPendingSuggestions(storage: NestStorage): Promise<PendingSuggestion[]> {
  const paths = await storage.provider.list('**/_suggestions/**/*.meta.yaml');
  const docIds = new Set<string>();
  for (const p of paths) {
    if (!p.endsWith('.meta.yaml') || p.includes('/_archive/')) continue;
    const m = /^(?:(.*)\/)?_suggestions\/([^/]+)\/[^/]+\.meta\.yaml$/.exec(p);
    if (!m) continue;
    docIds.add(m[1] ? `${m[1]}/${m[2]}` : m[2]);
  }
  const results: PendingSuggestion[] = [];
  for (const docId of docIds) {
    const metas = await listSuggestions(storage, docId);
    const doc = metas.length ? await readDocumentOrNull(storage, docId) : null;
    for (const meta of metas) results.push({ ...meta, title: doc?.frontmatter.title });
  }
  return results.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export interface SaveDraftInput {
  docId: string;
  /** Field edits merged over the draft (or the published document). */
  changes?: DraftChanges;
  /** Full replacement markdown (frontmatter + body). Mutually exclusive with `changes`. */
  content?: string;
  /** Reject the save if the draft has been saved by someone else since this revision. */
  expectedRevision?: number;
  /** Submit for review in the same step. */
  submit?: boolean;
  /** Optional note recorded with a submission. */
  message?: string;
}

/**
 * Create or update the draft for a document. Starting a draft on an existing
 * document snapshots its published version as the draft's base; starting one
 * on a path that doesn't exist yet creates a new-document draft (title required).
 */
export async function saveDraft(ctx: WorkflowContext, input: SaveDraftInput): Promise<Draft> {
  const { storage, actor } = ctx;
  const docId = normalizeDocId(input.docId);
  if (input.content !== undefined && input.changes !== undefined) {
    throw new ReviewError('Pass either `content` or `changes`, not both.', 'validation');
  }

  const existing = await readDraft(storage.provider, docId);
  if (
    existing &&
    input.expectedRevision !== undefined &&
    existing.revision !== input.expectedRevision
  ) {
    throw new ReviewError(
      `This draft was saved by ${existing.contributors.at(-1) ?? existing.author} since you opened it (revision ${existing.revision}, you have ${input.expectedRevision}). Reload to see their changes.`,
      'conflict',
      { currentRevision: existing.revision },
    );
  }
  if (existing && !canManage(existing, actor) && existing.status === 'in_review') {
    // Anyone with write access may collaborate on a draft, but a draft under
    // review is frozen to its author(s) and reviewers so the reviewer sees what
    // was submitted.
    throw new ReviewError(
      'This draft is in review. Only its author or a reviewer can change it.',
      'forbidden',
    );
  }

  let base: ContextNode;
  let isNew: boolean;
  let baseVersion: number | null;
  if (existing) {
    base = parseDraftContent(docId, existing.content);
    isNew = existing.isNew;
    baseVersion = existing.baseVersion;
  } else {
    const doc = await readDocumentOrNull(storage, docId);
    if (doc) {
      base = doc;
      isNew = false;
      baseVersion = doc.frontmatter.version ?? null;
    } else {
      const pathError = validateNewDocId(docId);
      if (pathError) throw new ReviewError(pathError, 'validation');
      const title = input.changes?.title?.trim();
      if (input.content === undefined && !title) {
        throw new ReviewError('A title is required to start a new document.', 'validation');
      }
      base = {
        id: docId,
        filePath: `${docId}.md`,
        frontmatter: {
          title: title ?? '',
          type: 'document',
          status: 'draft',
          created_at: now(),
        },
        body: `\n# ${title ?? ''}\n`,
        rawContent: '',
      };
      isNew = true;
      baseVersion = null;
    }
  }

  const next =
    input.content !== undefined
      ? parseDraftContent(docId, input.content)
      : applyChanges(base, input.changes ?? {});
  if (!next.frontmatter.title?.trim()) {
    throw new ReviewError('A title is required.', 'validation');
  }
  assertValid(next);
  const content = serializeDocument(next);

  const timestamp = now();
  const contentChanged = !existing || existing.content !== content;
  const draft: Draft = existing
    ? {
        ...existing,
        title: next.frontmatter.title,
        content,
        revision: contentChanged ? existing.revision + 1 : existing.revision,
        updatedAt: contentChanged ? timestamp : existing.updatedAt,
        contributors:
          contentChanged && !existing.contributors.includes(actor.login)
            ? [...existing.contributors, actor.login]
            : existing.contributors,
        activity:
          contentChanged ? [...existing.activity, activity('edited', actor.login)] : existing.activity,
      }
    : {
        docId,
        isNew,
        baseVersion,
        status: 'draft',
        title: next.frontmatter.title,
        content,
        author: actor.login,
        contributors: [actor.login],
        revision: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        submittedAt: null,
        activity: [activity('created', actor.login)],
      };

  if (input.submit && draft.status !== 'in_review') {
    draft.status = 'in_review';
    draft.submittedAt = timestamp;
    draft.updatedAt = timestamp;
    draft.activity = [...draft.activity, activity('submitted', actor.login, input.message?.trim())];
  }

  await writeDraft(storage.provider, draft);
  return draft;
}

export async function submitDraft(
  ctx: WorkflowContext,
  docId: string,
  message?: string,
): Promise<Draft> {
  const draft = await requireDraft(ctx.storage, docId);
  if (!canManage(draft, ctx.actor)) {
    throw new ReviewError('Only the draft’s author or contributors can submit it.', 'forbidden');
  }
  if (draft.status === 'in_review') {
    throw new ReviewError('This draft is already in review.', 'invalid_state');
  }
  const timestamp = now();
  const next: Draft = {
    ...draft,
    status: 'in_review',
    submittedAt: timestamp,
    updatedAt: timestamp,
    activity: [...draft.activity, activity('submitted', ctx.actor.login, message?.trim())],
  };
  await writeDraft(ctx.storage.provider, next);
  return next;
}

export async function withdrawDraft(ctx: WorkflowContext, docId: string): Promise<Draft> {
  const draft = await requireDraft(ctx.storage, docId);
  if (!canManage(draft, ctx.actor)) {
    throw new ReviewError('Only the draft’s author or contributors can withdraw it.', 'forbidden');
  }
  if (draft.status !== 'in_review') {
    throw new ReviewError('Only a draft that is in review can be withdrawn.', 'invalid_state');
  }
  const next: Draft = {
    ...draft,
    status: 'draft',
    updatedAt: now(),
    activity: [...draft.activity, activity('withdrawn', ctx.actor.login)],
  };
  await writeDraft(ctx.storage.provider, next);
  return next;
}

export async function commentOnDraft(
  ctx: WorkflowContext,
  docId: string,
  message: string,
): Promise<Draft> {
  const text = message.trim();
  if (!text) throw new ReviewError('A comment can’t be empty.', 'validation');
  const draft = await requireDraft(ctx.storage, docId);
  const next: Draft = {
    ...draft,
    updatedAt: now(),
    activity: [...draft.activity, activity('comment', ctx.actor.login, text)],
  };
  await writeDraft(ctx.storage.provider, next);
  return next;
}

export async function requestChanges(
  ctx: WorkflowContext,
  docId: string,
  message: string,
): Promise<Draft> {
  if (!ctx.actor.isReviewer) {
    throw new ReviewError('Only reviewers can request changes.', 'forbidden');
  }
  const text = message.trim();
  if (!text) {
    throw new ReviewError('Tell the author what needs to change.', 'validation');
  }
  const draft = await requireDraft(ctx.storage, docId);
  if (draft.status !== 'in_review') {
    throw new ReviewError('Changes can only be requested on a draft that is in review.', 'invalid_state');
  }
  const next: Draft = {
    ...draft,
    status: 'changes_requested',
    updatedAt: now(),
    activity: [...draft.activity, activity('changes_requested', ctx.actor.login, text)],
  };
  await writeDraft(ctx.storage.provider, next);
  return next;
}

export async function discardDraft(ctx: WorkflowContext, docId: string): Promise<void> {
  const draft = await requireDraft(ctx.storage, docId);
  if (!canManage(draft, ctx.actor)) {
    throw new ReviewError('Only the draft’s author, its contributors or a reviewer can discard it.', 'forbidden');
  }
  await deleteDraft(ctx.storage.provider, draft.docId);
}

export interface ApproveOptions {
  /** Optional note recorded on the published version. */
  note?: string;
  /** Publish even though the live document has moved past the draft's base version. */
  force?: boolean;
  /**
   * The draft revision the reviewer looked at. When given, approval refuses if
   * the draft has been edited since, so what gets published is what was reviewed.
   */
  expectedRevision?: number;
}

export interface ApproveResult {
  node: ContextNode;
  version: number | undefined;
  checkpoint: number;
  chainHash: string;
  author: string;
}

/**
 * Approve a draft in review: write its content as the canonical document,
 * publish (version bump, checksum, checkpoint, hash chain), regenerate the
 * index, mirror the published bytes to git, and remove the draft.
 */
export async function approveDraft(
  ctx: PublishContext,
  docId: string,
  options: ApproveOptions = {},
): Promise<ApproveResult> {
  const { storage, sync, userToken, actor } = ctx;
  if (!actor.isReviewer) {
    throw new ReviewError('Only reviewers can approve drafts.', 'forbidden');
  }
  const draft = await requireDraft(storage, docId);
  if (draft.status !== 'in_review') {
    throw new ReviewError(
      'Only a draft that has been submitted for review can be approved.',
      'invalid_state',
    );
  }
  if (options.expectedRevision !== undefined && draft.revision !== options.expectedRevision) {
    throw new ReviewError(
      `This draft was edited after you opened it (revision ${draft.revision}, you reviewed ${options.expectedRevision}). Reload and review the latest changes before approving.`,
      'conflict',
      { currentRevision: draft.revision },
    );
  }

  const current = await readDocumentOrNull(storage, draft.docId);
  if (draft.isNew && current && !options.force) {
    throw new ReviewError(
      `"${draft.docId}" was created by someone else after this draft was started. Approving would overwrite it.`,
      'stale',
      { currentVersion: current.frontmatter.version ?? null },
    );
  }
  if (
    !draft.isNew &&
    current &&
    (current.frontmatter.version ?? null) !== draft.baseVersion &&
    !options.force
  ) {
    throw new ReviewError(
      `The published document is now v${current.frontmatter.version}, but this draft was based on v${draft.baseVersion}. Approving would discard the newer changes.`,
      'stale',
      { currentVersion: current.frontmatter.version ?? null, baseVersion: draft.baseVersion },
    );
  }

  const node = parseDraftContent(draft.docId, draft.content);
  node.frontmatter = {
    ...node.frontmatter,
    // Carry the live version forward so publish bumps from the right number.
    ...(current?.frontmatter.version !== undefined ? { version: current.frontmatter.version } : {}),
    status: 'draft',
    updated_at: now(),
  };
  assertValid(node);
  await storage.writeDocument(draft.docId, serializeDocument(node));

  const authorLabel =
    draft.contributors.length > 1 ? draft.contributors.join(', ') : draft.author;
  const note = [
    options.note?.trim(),
    `Approved by ${actor.login}; authored by ${authorLabel}`,
  ]
    .filter(Boolean)
    .join(' — ');

  const result = await publishDocument(storage, draft.docId, {
    editedBy: draft.author,
    note,
  });
  await storage.regenerateIndex();
  await sync.commitFile({
    path: `${draft.docId}.md`,
    content: Buffer.from(serializeDocument(result.node), 'utf-8'),
    message: `${draft.isNew ? 'create' : 'update'} ${draft.docId} (approved by ${actor.login})`,
    editedBy: draft.author,
    userToken,
  });
  await deleteDraft(storage.provider, draft.docId);

  return {
    node: result.node,
    version: result.node.frontmatter.version,
    checkpoint: result.checkpointNumber,
    chainHash: result.versionEntry.chain_hash,
    author: draft.author,
  };
}
