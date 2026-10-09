import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { NestStorage } from '@promptowl/contextnest-engine';
import { createEngine } from '@/lib/vault/index';
import {
  DRAFT_STATUSES,
  ReviewError,
  approveDraft,
  commentOnDraft,
  discardDraft,
  getDraft,
  isReviewRequired,
  isReviewer,
  listDrafts,
  listPendingSuggestions,
  normalizeDocId,
  readDocumentOrNull,
  requestChanges,
  saveDraft,
  submitDraft,
  withdrawDraft,
} from '@/lib/review';
import type { Draft, ReviewActor } from '@/lib/review';
import { NODE_TYPES } from './typed-blocks';
import { errorResult, getExtra, jsonResult, requireWriteScope } from './tool-helpers';
import type { ToolRegistrar } from './tool-helpers';

const DEFAULT_ACTOR = 'mcp@contextnest.hosted';

function actorFrom(authInfo: unknown): ReviewActor {
  const login = getExtra(authInfo).userLogin || DEFAULT_ACTOR;
  return { login, isReviewer: isReviewer(login) };
}

function reviewErrorResult(err: unknown): CallToolResult {
  if (err instanceof ReviewError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            { error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  throw err;
}

function draftView(draft: Draft, includeContent: boolean) {
  return {
    path: draft.docId,
    title: draft.title,
    status: draft.status,
    is_new: draft.isNew,
    base_version: draft.baseVersion,
    revision: draft.revision,
    author: draft.author,
    contributors: draft.contributors,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
    submitted_at: draft.submittedAt,
    activity: draft.activity,
    ...(includeContent ? { content: draft.content } : {}),
  };
}

/**
 * When `CONTEXTNEST_REQUIRE_REVIEW=true`, a direct create/update from a
 * non-reviewer is saved as a draft and submitted for review instead of being
 * published. Returns the tool result to send back, or `null` to let the caller
 * publish as usual.
 */
export async function routeWriteToReview(
  authInfo: unknown,
  storage: NestStorage,
  docId: string,
  content: string,
  verb: 'create' | 'update',
): Promise<CallToolResult | null> {
  if (!isReviewRequired()) return null;
  const actor = actorFrom(authInfo);
  if (actor.isReviewer) return null;
  try {
    const draft = await saveDraft(
      { storage, actor },
      { docId, content, submit: true, message: `Submitted via ${verb}_document` },
    );
    return jsonResult({
      ...draftView(draft, false),
      published: false,
      message: `This vault requires review. Your ${verb} was saved as a draft and submitted for review instead of being published. Track it with read_draft({ path: "${draft.docId}" }).`,
    });
  } catch (err) {
    return reviewErrorResult(err);
  }
}

/** Under required review, publish/delete are reviewer-only. */
export function requireReviewerForDirectWrite(authInfo: unknown): CallToolResult | null {
  if (!isReviewRequired()) return null;
  if (actorFrom(authInfo).isReviewer) return null;
  return errorResult(
    'This vault requires review: only reviewers can publish or delete directly. Use save_draft and submit_draft to propose a change.',
  );
}

export function registerReviewTools(tool: ToolRegistrar): void {
  const pathArg = z.string().describe("Document path (e.g., 'nodes/api-design')");

  // ── save_draft ─────────────────────────────────────────────────────────────
  tool(
    'save_draft',
    'Save proposed changes to a document as a draft WITHOUT publishing. Creates the draft on first call (snapshotting the published version as its base, or starting a new document when the path does not exist — title required), and merges further edits into it on later calls. The canonical document is untouched until a reviewer approves. Pass submit: true to submit for review in the same call.',
    {
      path: pathArg,
      title: z.string().optional().describe('Title (required when the document does not exist yet)'),
      description: z.string().optional().describe('Short summary; empty string removes it'),
      tags: z.array(z.string()).optional().describe('Tags (replaces existing)'),
      type: z.enum(NODE_TYPES).optional().describe('Node type'),
      body: z.string().optional().describe('Markdown body (replaces the draft body)'),
      content: z.string().optional().describe('Alias for `body`.'),
      expected_revision: z
        .number()
        .int()
        .optional()
        .describe('Fail with a conflict if the draft has been saved since this revision'),
      submit: z.boolean().optional().describe('Submit for review after saving (default false)'),
      message: z.string().optional().describe('Note for reviewers, recorded when submitting'),
    },
    async (args, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      if (args.body !== undefined && args.content !== undefined && args.body !== args.content) {
        return errorResult('Both `body` and `content` were provided with different text — pass only one.');
      }
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        const draft = await saveDraft(
          { storage, actor: actorFrom(ctx.authInfo) },
          {
            docId: args.path,
            changes: {
              title: args.title,
              description: args.description,
              tags: args.tags,
              type: args.type,
              body: args.body ?? args.content,
            },
            expectedRevision: args.expected_revision,
            submit: args.submit,
            message: args.message,
          },
        );
        return jsonResult({
          ...draftView(draft, false),
          message:
            draft.status === 'in_review'
              ? 'Draft saved and submitted for review.'
              : 'Draft saved. Nothing is published until it is submitted and approved — call submit_draft when ready.',
        });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── read_draft ─────────────────────────────────────────────────────────────
  tool(
    'read_draft',
    'Read the pending draft for a document: full proposed content, status, revision, and the comment/review activity thread. Also reports the currently published version for comparison.',
    { path: pathArg },
    async ({ path }, ctx) => {
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      const draft = await getDraft(storage, path);
      if (!draft) return errorResult(`No draft exists for "${normalizeDocId(path)}".`);
      const published = draft.isNew ? null : await readDocumentOrNull(storage, draft.docId);
      return jsonResult({
        ...draftView(draft, true),
        published_version: published?.frontmatter.version ?? null,
        stale:
          !draft.isNew && published
            ? (published.frontmatter.version ?? null) !== draft.baseVersion
            : false,
      });
    },
  );

  // ── list_drafts ────────────────────────────────────────────────────────────
  tool(
    'list_drafts',
    'List pending drafts in the vault, optionally filtered by status or to drafts you authored/contributed to.',
    {
      status: z.enum(DRAFT_STATUSES as [string, ...string[]]).optional().describe('Filter by status'),
      mine: z.boolean().optional().describe('Only drafts you authored or contributed to'),
    },
    async ({ status, mine }, ctx) => {
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      const drafts = await listDrafts(storage, {
        status: status as Draft['status'] | undefined,
        involving: mine ? actorFrom(ctx.authInfo).login : undefined,
      });
      return jsonResult({ count: drafts.length, drafts });
    },
  );

  // ── list_review_queue ──────────────────────────────────────────────────────
  tool(
    'list_review_queue',
    'Vault-wide review queue: every draft submitted for review (oldest submission first), plus whether you can approve. Optionally includes staged drift suggestions.',
    {
      include_suggestions: z
        .boolean()
        .optional()
        .describe('Also list staged drift suggestions (scans the whole vault; slower)'),
    },
    async ({ include_suggestions }, ctx) => {
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      const drafts = (await listDrafts(storage, { status: 'in_review' })).sort((a, b) =>
        (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''),
      );
      const actor = actorFrom(ctx.authInfo);
      return jsonResult({
        you: actor,
        count: drafts.length,
        drafts,
        ...(include_suggestions ? { suggestions: await listPendingSuggestions(storage) } : {}),
      });
    },
  );

  // ── submit_draft ───────────────────────────────────────────────────────────
  tool(
    'submit_draft',
    'Submit a draft for review. Also used to resubmit after a reviewer requested changes.',
    {
      path: pathArg,
      message: z.string().optional().describe('Note for reviewers'),
    },
    async ({ path, message }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        const draft = await submitDraft({ storage, actor: actorFrom(ctx.authInfo) }, path, message);
        return jsonResult({ ...draftView(draft, false), message: 'Submitted for review.' });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── withdraw_draft ─────────────────────────────────────────────────────────
  tool(
    'withdraw_draft',
    'Pull a submitted draft back out of review so it can keep being edited.',
    { path: pathArg },
    async ({ path }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        const draft = await withdrawDraft({ storage, actor: actorFrom(ctx.authInfo) }, path);
        return jsonResult({ ...draftView(draft, false), message: 'Withdrawn from review.' });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── comment_on_draft ───────────────────────────────────────────────────────
  tool(
    'comment_on_draft',
    'Add a comment to a draft’s review thread.',
    { path: pathArg, message: z.string().describe('Comment text') },
    async ({ path, message }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        const draft = await commentOnDraft({ storage, actor: actorFrom(ctx.authInfo) }, path, message);
        return jsonResult({ ...draftView(draft, false), message: 'Comment added.' });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── request_changes ────────────────────────────────────────────────────────
  tool(
    'request_changes',
    'Reviewer only: send a submitted draft back to its author with feedback. The draft stays editable; the author resubmits with submit_draft.',
    { path: pathArg, message: z.string().describe('What needs to change (required)') },
    async ({ path, message }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        const draft = await requestChanges({ storage, actor: actorFrom(ctx.authInfo) }, path, message);
        return jsonResult({ ...draftView(draft, false), message: 'Changes requested.' });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── approve_draft ──────────────────────────────────────────────────────────
  tool(
    'approve_draft',
    'Reviewer only: approve a submitted draft and publish it — writes the draft over the document, bumps the version, records a checkpoint and hash-chain entry, mirrors to git, and removes the draft. Refuses if the published document changed since the draft was started unless force: true.',
    {
      path: pathArg,
      note: z.string().optional().describe('Version note'),
      force: z
        .boolean()
        .optional()
        .describe('Publish even if the document was published again after the draft was started'),
      expected_revision: z
        .number()
        .int()
        .optional()
        .describe(
          'The draft `revision` you reviewed (from read_draft). Approval is refused if the draft was edited since. Strongly recommended.',
        ),
    },
    async ({ path, note, force, expected_revision }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage, sync, userToken } = createEngine(extra.userToken, extra.vaultId);
      try {
        const result = await approveDraft(
          { storage, sync, userToken, actor: actorFrom(ctx.authInfo) },
          path,
          { note, force, expectedRevision: expected_revision },
        );
        return jsonResult({
          id: result.node.id,
          version: result.version,
          checkpoint: result.checkpoint,
          chain_hash: result.chainHash,
          author: result.author,
          message: 'Draft approved and published.',
        });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );

  // ── discard_draft ──────────────────────────────────────────────────────────
  tool(
    'discard_draft',
    'Delete a draft without publishing it (author, contributors or reviewers).',
    { path: pathArg },
    async ({ path }, ctx) => {
      const permErr = requireWriteScope(ctx.authInfo);
      if (permErr) return permErr;
      const extra = getExtra(ctx.authInfo);
      const { storage } = createEngine(extra.userToken, extra.vaultId);
      try {
        await discardDraft({ storage, actor: actorFrom(ctx.authInfo) }, path);
        return jsonResult({ path: normalizeDocId(path), message: 'Draft discarded.' });
      } catch (err) {
        return reviewErrorResult(err);
      }
    },
  );
}
