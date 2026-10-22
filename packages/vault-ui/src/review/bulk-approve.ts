import { ReviewError } from './types';
import { approveDraft } from './workflow';
import type { PublishContext } from './workflow';

export interface BulkApproveItem {
  docId: string;
  /** The draft revision the reviewer saw in the list. */
  revision: number;
}

export interface BulkApproveResult {
  approved: { docId: string; version: number | undefined }[];
  /** Left alone on purpose: publishing would overwrite a newer published version. */
  skipped: { docId: string; reason: string }[];
  /** Could not be approved: edited since listed, no longer in review, or a publish error. */
  failed: { docId: string; error: string }[];
}

/**
 * Approve several drafts one after another (each publish touches versioning and
 * git, so they never run in parallel). Never forces: stale drafts are skipped,
 * and one item failing doesn't stop the rest.
 */
export async function approveDrafts(
  ctx: PublishContext,
  items: BulkApproveItem[],
  options: { note?: string } = {},
): Promise<BulkApproveResult> {
  const result: BulkApproveResult = { approved: [], skipped: [], failed: [] };
  for (const { docId, revision } of items) {
    try {
      const approved = await approveDraft(ctx, docId, { note: options.note, expectedRevision: revision });
      result.approved.push({ docId, version: approved.version });
    } catch (err) {
      if (err instanceof ReviewError && err.code === 'stale') {
        result.skipped.push({ docId, reason: err.message });
      } else {
        result.failed.push({ docId, error: (err as Error).message || 'Approval failed.' });
      }
    }
  }
  return result;
}
