import 'server-only';
import { cache } from 'react';
import type { ContextNode } from '@promptowl/contextnest-engine';
import { listDrafts } from '@/lib/review';
import type { DraftSummary } from '@/lib/review';
import { engineFor, requireViewer } from './context';
import type { DocListItem, FolderNode } from './types';
import { buildLinkIndex } from './wikilinks';
import type { LinkIndex } from './wikilinks';

/** Every document in the vault, parsed once per request. */
export const loadNodes = cache(async (vaultId: string): Promise<ContextNode[]> => {
  const viewer = await requireViewer();
  const { storage } = engineFor(viewer, vaultId);
  const nodes = await storage.discoverDocuments();
  return nodes.sort((a, b) => a.id.localeCompare(b.id));
});

/** Every pending draft, keyed by document id. */
export const loadDrafts = cache(async (vaultId: string): Promise<DraftSummary[]> => {
  const viewer = await requireViewer();
  const { storage } = engineFor(viewer, vaultId);
  return listDrafts(storage);
});

export function folderOf(id: string): string {
  const i = id.lastIndexOf('/');
  return i === -1 ? '' : id.slice(0, i);
}

export function toListItem(node: ContextNode, draft?: DraftSummary): DocListItem {
  const fm = node.frontmatter;
  return {
    id: node.id,
    title: fm.title || node.id,
    description: fm.description ?? null,
    type: fm.type ?? 'document',
    status: fm.status ?? 'draft',
    version: fm.version ?? null,
    tags: fm.tags ?? [],
    updatedAt: fm.updated_at ?? fm.created_at ?? null,
    folder: folderOf(node.id),
    draftStatus: draft?.status ?? null,
  };
}

export async function loadDocList(vaultId: string): Promise<DocListItem[]> {
  const [nodes, drafts] = await Promise.all([loadNodes(vaultId), loadDrafts(vaultId)]);
  const byDoc = new Map(drafts.map((d) => [d.docId, d]));
  return nodes.map((n) => toListItem(n, byDoc.get(n.id)));
}

export function buildFolderTree(items: { folder: string }[]): FolderNode {
  const root: FolderNode = { name: '', path: '', count: 0, children: [] };
  for (const item of items) {
    root.count++;
    if (!item.folder) continue;
    let cursor = root;
    const parts = item.folder.split('/');
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join('/');
      let child = cursor.children.find((c) => c.path === path);
      if (!child) {
        child = { name: part, path, count: 0, children: [] };
        cursor.children.push(child);
      }
      child.count++;
      cursor = child;
    });
  }
  const sort = (node: FolderNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sort);
  };
  sort(root);
  return root;
}

/**
 * Rank documents for a free-text query: title hits first, then path, tags and
 * description, then body. Every whitespace-separated term must match somewhere.
 */
export function searchNodes(nodes: ContextNode[], query: string): ContextNode[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return nodes;
  const scored: { node: ContextNode; score: number }[] = [];
  for (const node of nodes) {
    const fm = node.frontmatter;
    const fields = {
      title: (fm.title ?? '').toLowerCase(),
      id: node.id.toLowerCase(),
      meta: [fm.description ?? '', ...(fm.tags ?? [])].join(' ').toLowerCase(),
      body: node.body.toLowerCase(),
    };
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      if (fields.title.includes(term)) score += 10;
      else if (fields.id.includes(term)) score += 6;
      else if (fields.meta.includes(term)) score += 4;
      else if (fields.body.includes(term)) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) scored.push({ node, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id)).map((s) => s.node);
}

/** A short excerpt of the body around the first matching term, for search results. */
export function excerptFor(node: ContextNode, query: string): string | null {
  const body = node.body.replace(/[#>*_`[\]]/g, '').replace(/\s+/g, ' ').trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = body.toLowerCase();
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1) {
      const start = Math.max(0, i - 60);
      const end = Math.min(body.length, i + term.length + 100);
      return `${start > 0 ? '…' : ''}${body.slice(start, end)}${end < body.length ? '…' : ''}`;
    }
  }
  return null;
}

/** Title/id lookup for resolving links between documents. */
export const loadLinkIndex = cache(async (vaultId: string): Promise<LinkIndex> => buildLinkIndex(await loadNodes(vaultId)));
