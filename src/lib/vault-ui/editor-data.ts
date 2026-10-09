import 'server-only';
import type { Draft } from '@/lib/review';
import { folderOf, loadNodes } from './data';
import type { VaultViewer } from './context';

/** Every folder that holds at least one document, for the new-document location picker. */
export async function loadFolders(vaultId: string): Promise<string[]> {
  const nodes = await loadNodes(vaultId);
  const folders = new Set<string>();
  for (const node of nodes) {
    const folder = folderOf(node.id);
    if (!folder) continue;
    const parts = folder.split('/');
    parts.forEach((_, i) => folders.add(parts.slice(0, i + 1).join('/')));
  }
  return [...folders].sort();
}

/** Mirrors the workflow rule: a draft in review is frozen to its authors and reviewers. */
export function draftLockReason(draft: Draft | null, viewer: VaultViewer): string | null {
  if (!draft || draft.status !== 'in_review' || viewer.isReviewer) return null;
  const login = viewer.login.toLowerCase();
  const involved =
    draft.author.toLowerCase() === login || draft.contributors.some((c) => c.toLowerCase() === login);
  return involved
    ? null
    : `${draft.author} has submitted this draft for review, so it can't be changed until a reviewer approves it or sends it back.`;
}
