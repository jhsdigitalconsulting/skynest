'use server';

import { revalidatePath } from 'next/cache';
import {
  VersionManager,
  approveSuggestion,
  rejectSuggestion,
  serializeDocument,
} from '@promptowl/contextnest-engine';
import type { RbacHook } from '@promptowl/contextnest-engine';
import {
  ReviewError,
  approveDraft,
  approveDrafts,
  commentOnDraft,
  discardDraft,
  listDrafts,
  normalizeDocId,
  requestChanges,
  saveDraft,
  submitDraft,
  withdrawDraft,
} from '@/lib/review';
import type { BulkApproveItem, DraftChanges } from '@/lib/review';
import {
  VaultAuthError,
  actorFor,
  engineFor,
  requireWriter,
} from '@/lib/vault-ui/context';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { nextInReview } from '@/lib/vault-ui/review-queue';
import type { ActionResult, EditorFields } from '@/lib/vault-ui/types';
import { applySettings } from '@/lib/vault-ui/vault-settings';
import type { VaultSettingsInput } from '@/lib/vault-ui/vault-settings';

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const result = await fn();
    revalidatePath('/vault', 'layout');
    return result;
  } catch (err) {
    if (err instanceof ReviewError) return { ok: false, error: err.message, code: err.code };
    if (err instanceof VaultAuthError) return { ok: false, error: err.message, code: 'forbidden' };
    console.error('[vault action]', err);
    return { ok: false, error: (err as Error).message || 'Something went wrong.' };
  }
}

function toChanges(fields: EditorFields, isNew: boolean): DraftChanges {
  return {
    title: fields.title,
    description: fields.description,
    tags: fields.tags,
    body: fields.body,
    ...(isNew ? { type: fields.type } : {}),
  };
}

export interface SaveInput {
  docId: string;
  isNew: boolean;
  fields: EditorFields;
  /** Revision the editor loaded; null when no draft existed yet. */
  expectedRevision: number | null;
}

export async function saveDraftAction(vaultId: string, input: SaveInput): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    const draft = await saveDraft(
      { storage, actor: actorFor(viewer) },
      {
        docId: input.docId,
        changes: toChanges(input.fields, input.isNew),
        expectedRevision: input.expectedRevision ?? undefined,
      },
    );
    return { ok: true, message: 'Draft saved', revision: draft.revision };
  });
}

export async function submitForReviewAction(
  vaultId: string,
  input: SaveInput & { message?: string },
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    const draft = await saveDraft(
      { storage, actor: actorFor(viewer) },
      {
        docId: input.docId,
        changes: toChanges(input.fields, input.isNew),
        expectedRevision: input.expectedRevision ?? undefined,
        submit: true,
        message: input.message,
      },
    );
    return {
      ok: true,
      message: 'Submitted for review',
      redirectTo: vaultUrls(vaultId).reviewDraft(draft.docId),
    };
  });
}

/** Reviewer shortcut: save, submit and approve in one step. */
export async function publishNowAction(vaultId: string, input: SaveInput & { note?: string }): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (!viewer.isReviewer) {
      return { ok: false, error: 'Only reviewers can publish directly.', code: 'forbidden' };
    }
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const actor = actorFor(viewer);
    const draft = await saveDraft(
      { storage, actor },
      {
        docId: input.docId,
        changes: toChanges(input.fields, input.isNew),
        expectedRevision: input.expectedRevision ?? undefined,
        submit: true,
      },
    );
    const result = await approveDraft({ storage, sync, userToken, actor }, draft.docId, {
      note: input.note,
    });
    return {
      ok: true,
      message: `Published v${result.version}`,
      redirectTo: vaultUrls(vaultId).doc(draft.docId),
    };
  });
}

export async function submitDraftAction(vaultId: string, docId: string, message?: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    await submitDraft({ storage, actor: actorFor(viewer) }, docId, message);
    return { ok: true, message: 'Submitted for review' };
  });
}

export async function withdrawDraftAction(vaultId: string, docId: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    await withdrawDraft({ storage, actor: actorFor(viewer) }, docId);
    return { ok: true, message: 'Withdrawn from review' };
  });
}

export async function discardDraftAction(vaultId: string, docId: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    const id = normalizeDocId(docId);
    const existed = await storage.provider.exists(`${id}.md`);
    await discardDraft({ storage, actor: actorFor(viewer) }, id);
    return {
      ok: true,
      message: 'Draft discarded',
      redirectTo: existed ? vaultUrls(vaultId).doc(id) : vaultUrls(vaultId).review(),
    };
  });
}

export async function commentAction(vaultId: string, docId: string, message: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    await commentOnDraft({ storage, actor: actorFor(viewer) }, docId, message);
    return { ok: true, message: 'Comment added' };
  });
}

/**
 * Where to go once `docId` has left the review queue: the item that took its place.
 * `current` is the document open in the review pane; when the action was about some
 * other document the pane stays put (null).
 */
function advanceTo(
  vaultId: string,
  drafts: Awaited<ReturnType<typeof listDrafts>>,
  docId: string,
  current: string | null,
  gone: readonly string[] = [],
): string | null {
  if (current === null || (current !== docId && !gone.includes(current))) return null;
  const next = nextInReview(drafts, current, gone);
  return next ? vaultUrls(vaultId).reviewDraft(next, undefined, 'review') : null;
}

export async function requestChangesAction(
  vaultId: string,
  docId: string,
  message: string,
  options: { current?: string | null } = {},
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    const before = await listDrafts(storage, { status: 'in_review' });
    await requestChanges({ storage, actor: actorFor(viewer) }, docId, message);
    const id = normalizeDocId(docId);
    const redirectTo = advanceTo(vaultId, before, id, options.current === undefined ? id : options.current);
    return {
      ok: true,
      message: 'Changes requested — the author has been sent your feedback',
      ...(redirectTo ? { redirectTo } : {}),
    };
  });
}

export async function approveAction(
  vaultId: string,
  docId: string,
  options: { note?: string; force?: boolean; expectedRevision?: number; current?: string | null } = {},
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const { current, ...approveOptions } = options;
    const id = normalizeDocId(docId);
    const before = await listDrafts(storage, { status: 'in_review' });
    const result = await approveDraft(
      { storage, sync, userToken, actor: actorFor(viewer) },
      docId,
      approveOptions,
    );
    const waiting = before.length - 1;
    const viewing = current === undefined ? id : current;
    const next = advanceTo(vaultId, before, id, viewing);
    const message = waiting
      ? `Approved and published v${result.version} · ${waiting} more waiting for review`
      : `Approved and published v${result.version}`;
    // A reviewer working the queue wants the next item, not the doc they just approved.
    // With nothing left (or the approval was for another item), open the doc or stay put.
    if (next) return { ok: true, message, redirectTo: next };
    if (viewing === id) return { ok: true, message, redirectTo: vaultUrls(vaultId).doc(id) };
    return { ok: true, message };
  });
}

/** Approve several drafts in one go. Stale drafts are skipped, never force-published. */
export async function bulkApproveAction(
  vaultId: string,
  items: BulkApproveItem[],
  options: { note?: string; current?: string | null } = {},
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (items.length === 0) return { ok: false, error: 'Nothing selected.' };
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const before = await listDrafts(storage, { status: 'in_review' });
    const res = await approveDrafts({ storage, sync, userToken, actor: actorFor(viewer) }, items, {
      note: options.note,
    });
    const parts = [`Approved ${res.approved.length}`];
    if (res.skipped.length) parts.push(`${res.skipped.length} skipped (out of date)`);
    if (res.failed.length) parts.push(`${res.failed.length} failed (${res.failed[0].error})`);
    const message = parts.join(' · ');
    if (res.approved.length === 0) return { ok: false, error: message };
    const gone = res.approved.map((a) => a.docId);
    const current = options.current ?? null;
    // When the open item was approved, move on to whatever is next (or back to the empty queue).
    const redirectTo =
      current && gone.includes(current)
        ? (advanceTo(vaultId, before, current, current, gone) ?? vaultUrls(vaultId).review())
        : null;
    return { ok: true, message, ...(redirectTo ? { redirectTo } : {}) };
  });
}

/** Start (or overwrite the body of) a draft from a past version, then open it in the editor. */
export async function restoreVersionAction(vaultId: string, docId: string, version: number): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    const id = normalizeDocId(docId);
    const raw = await new VersionManager(storage).reconstructVersion(id, version);
    await saveDraft({ storage, actor: actorFor(viewer) }, { docId: id, content: raw });
    return {
      ok: true,
      message: `Started a draft from v${version}`,
      redirectTo: vaultUrls(vaultId).edit(id),
    };
  });
}

/** Overwrite the vault's CONTEXT.md. It's the vault-level system prompt, so only reviewers may change it. */
export async function saveContextMdAction(vaultId: string, content: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (!viewer.isReviewer) {
      return { ok: false, error: 'Only reviewers can edit the vault instructions.', code: 'forbidden' };
    }
    const { storage } = engineFor(viewer, vaultId);
    await storage.writeContextMd(content);
    return { ok: true, message: 'Vault instructions saved' };
  });
}

// Zone RBAC isn't enforced per call in the hosted vault (see the MCP tools); the reviewer check below is the gate.
const permissiveRbac: RbacHook = {
  isCzar: () => true,
  canIngest: () => true,
  isDocOwner: () => true,
};

/** Apply a drift suggestion: patches the document and publishes it as a new version. Reviewer-only. */
export async function approveSuggestionAction(
  vaultId: string,
  docId: string,
  suggestionId: string,
  comment?: string,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (!viewer.isReviewer) {
      return { ok: false, error: 'Only reviewers can apply suggestions.', code: 'forbidden' };
    }
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const id = normalizeDocId(docId);
    const node = await storage.readDocument(id);
    const result = await approveSuggestion({
      storage,
      rbac: permissiveRbac,
      documentId: id,
      actor: viewer.login,
      zone: node.frontmatter.zone ?? 'default',
      suggestionId,
      comment: comment || undefined,
    });
    await storage.regenerateIndex();
    const updated = await storage.readDocument(id);
    await sync.commitFile({
      path: `${id}.md`,
      content: Buffer.from(serializeDocument(updated), 'utf-8'),
      message: `approve suggestion ${suggestionId} on ${id}`,
      editedBy: viewer.login,
      userToken,
    });
    return { ok: true, message: `Suggestion applied — published v${result.versionEntry.version}` };
  });
}

/** Dismiss a drift suggestion. The document is untouched; the suggestion is archived with the reason. */
export async function rejectSuggestionAction(
  vaultId: string,
  docId: string,
  suggestionId: string,
  reason: string,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (!viewer.isReviewer) {
      return { ok: false, error: 'Only reviewers can dismiss suggestions.', code: 'forbidden' };
    }
    if (!reason.trim()) return { ok: false, error: 'Add a reason for dismissing the suggestion.' };
    const { storage } = engineFor(viewer, vaultId);
    const id = normalizeDocId(docId);
    const node = await storage.readDocument(id);
    await rejectSuggestion({
      storage,
      rbac: permissiveRbac,
      documentId: id,
      actor: viewer.login,
      zone: node.frontmatter.zone ?? 'default',
      suggestionId,
      reason: reason.trim(),
    });
    return { ok: true, message: 'Suggestion dismissed' };
  });
}

/**
 * Save the Settings page to .context/config.yaml and commit it. Settings the page
 * doesn't edit (version, servers, sync…) are kept as they are. Reviewer-only.
 */
export async function saveVaultSettingsAction(vaultId: string, input: VaultSettingsInput): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    if (!viewer.isReviewer) {
      return { ok: false, error: 'Only reviewers can change the vault settings.', code: 'forbidden' };
    }
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const [config, nodes] = await Promise.all([storage.readConfig(), storage.discoverDocuments()]);
    const result = applySettings(config, input, new Set(nodes.map((n) => n.id)));
    if (!result.ok) return { ok: false, error: result.error };
    await storage.writeConfig(result.config);
    const written = await storage.provider.read('.context/config.yaml');
    if (written) {
      await sync.commitFile({
        path: '.context/config.yaml',
        content: written,
        message: 'update vault settings',
        editedBy: viewer.login,
        userToken,
      });
    }
    return { ok: true, message: 'Vault settings saved' };
  });
}
