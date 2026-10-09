'use server';

import { revalidatePath } from 'next/cache';
import { VersionManager } from '@promptowl/contextnest-engine';
import {
  ReviewError,
  approveDraft,
  commentOnDraft,
  discardDraft,
  normalizeDocId,
  requestChanges,
  saveDraft,
  submitDraft,
  withdrawDraft,
} from '@/lib/review';
import type { DraftChanges } from '@/lib/review';
import {
  VaultAuthError,
  actorFor,
  engineFor,
  requireWriter,
} from '@/lib/vault-ui/context';
import { vaultUrls } from '@/lib/vault-ui/paths';
import type { ActionResult, EditorFields } from '@/lib/vault-ui/types';

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

export async function requestChangesAction(vaultId: string, docId: string, message: string): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage } = engineFor(viewer, vaultId);
    await requestChanges({ storage, actor: actorFor(viewer) }, docId, message);
    return { ok: true, message: 'Changes requested — the author has been sent your feedback' };
  });
}

export async function approveAction(
  vaultId: string,
  docId: string,
  options: { note?: string; force?: boolean; expectedRevision?: number } = {},
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await requireWriter();
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const result = await approveDraft(
      { storage, sync, userToken, actor: actorFor(viewer) },
      docId,
      options,
    );
    return {
      ok: true,
      message: `Approved and published v${result.version}`,
      redirectTo: vaultUrls(vaultId).doc(normalizeDocId(docId)),
    };
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
