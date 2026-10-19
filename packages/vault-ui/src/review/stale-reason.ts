import type { ContextNode } from '@promptowl/contextnest-engine';
import type { Draft } from './types';

/** The parts of a draft that decide whether it has fallen behind the published document. */
export interface DraftBase {
  isNew: boolean;
  baseVersion: number | null;
}

/** The published document's version, or null when nothing is published at that path. */
export interface PublishedState {
  version: number | null;
}

/**
 * True when approving the draft would overwrite published content it never saw:
 * a "new" document that someone else published meanwhile, or an edit whose base
 * version is no longer the live one. The review queue and review page both use this.
 */
export function isDraftStale(draft: DraftBase, published: PublishedState | null): boolean {
  if (!published) return false;
  return draft.isNew || published.version !== draft.baseVersion;
}

/** Why approving this draft would overwrite newer published content, or null if it wouldn't. */
export function staleReasonFor(draft: Draft, node: ContextNode | null): string | null {
  const published = node ? { version: node.frontmatter.version ?? null } : null;
  if (!isDraftStale(draft, published)) return null;
  if (draft.isNew) {
    return `Someone published “${draft.docId}” after this draft was started. Approving will overwrite it.`;
  }
  return `The published document moved to v${published?.version} after this draft was started from v${draft.baseVersion ?? '–'}. Approving will replace those newer changes.`;
}
