import type { StorageProvider } from '@promptowl/contextnest-engine';
import type { Draft, DraftSummary } from './types';

/**
 * Drafts live under `_drafts/` as JSON — deliberately not `.md`, so document
 * discovery, the index generator and search never mistake a pending draft for
 * a published document. They are also never mirrored to git: the repo only
 * ever receives approved, published bytes.
 */
export const DRAFTS_DIR = '_drafts';

/** Doc ids contain `/`; base64url keeps one flat, filesystem- and blob-safe key per document. */
export function draftKey(docId: string): string {
  return Buffer.from(docId, 'utf-8').toString('base64url');
}

export function draftPath(docId: string): string {
  return `${DRAFTS_DIR}/${draftKey(docId)}.json`;
}

export function normalizeDocId(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.md$/, '');
}

export async function readDraft(provider: StorageProvider, docId: string): Promise<Draft | null> {
  const buf = await provider.read(draftPath(docId));
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString('utf-8')) as Draft;
  } catch {
    return null;
  }
}

export async function writeDraft(provider: StorageProvider, draft: Draft): Promise<void> {
  await provider.write(draftPath(draft.docId), Buffer.from(JSON.stringify(draft, null, 2), 'utf-8'));
}

export async function deleteDraft(provider: StorageProvider, docId: string): Promise<void> {
  await provider.delete(draftPath(docId));
}

export async function listDraftRecords(provider: StorageProvider): Promise<Draft[]> {
  const paths = await provider.list(`${DRAFTS_DIR}/*.json`);
  const drafts = await Promise.all(
    paths
      // A blob prefix listing is recursive; keep only top-level draft files.
      .filter((p) => p.startsWith(`${DRAFTS_DIR}/`) && !p.slice(DRAFTS_DIR.length + 1).includes('/'))
      .map(async (p) => {
        const buf = await provider.read(p);
        if (!buf) return null;
        try {
          return JSON.parse(buf.toString('utf-8')) as Draft;
        } catch {
          return null;
        }
      }),
  );
  return drafts
    .filter((d): d is Draft => d !== null && typeof d.docId === 'string')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function summarizeDraft(draft: Draft): DraftSummary {
  return {
    docId: draft.docId,
    isNew: draft.isNew,
    baseVersion: draft.baseVersion,
    status: draft.status,
    title: draft.title,
    author: draft.author,
    contributors: draft.contributors,
    revision: draft.revision,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    submittedAt: draft.submittedAt,
    commentCount: draft.activity.filter((a) => a.kind === 'comment' || a.kind === 'changes_requested')
      .length,
  };
}
