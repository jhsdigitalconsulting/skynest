import type { ContextNode } from '@promptowl/contextnest-engine';
import type { Draft } from './types';

/** Why approving this draft would overwrite newer published content, or null if it wouldn't. */
export function staleReasonFor(draft: Draft, node: ContextNode | null): string | null {
  if (draft.isNew && node) {
    return `Someone published “${draft.docId}” after this draft was started. Approving will overwrite it.`;
  }
  const live = node?.frontmatter.version ?? null;
  if (!draft.isNew && node && live !== draft.baseVersion) {
    return `The published document moved to v${live} after this draft was started from v${draft.baseVersion ?? '–'}. Approving will replace those newer changes.`;
  }
  return null;
}
