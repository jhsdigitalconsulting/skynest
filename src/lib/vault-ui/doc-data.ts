import 'server-only';
import { VersionManager, parseDocument } from '@promptowl/contextnest-engine';
import type { ContextNode, NestStorage } from '@promptowl/contextnest-engine';
import type { DocSnapshot, VersionItem } from './types';

export function snapshotOf(node: ContextNode): DocSnapshot {
  const fm = node.frontmatter;
  return {
    title: fm.title ?? '',
    description: fm.description ?? '',
    tags: fm.tags ?? [],
    type: fm.type ?? 'document',
    body: node.body.replace(/^\n+|\s+$/g, ''),
  };
}

export function parseSnapshot(docId: string, content: string): DocSnapshot {
  return snapshotOf(parseDocument(`${docId}.md`, content, docId));
}

/** Published versions, newest first. A missing or unreadable history yields an empty list. */
export async function loadHistory(storage: NestStorage, docId: string): Promise<VersionItem[]> {
  try {
    const history = await storage.readHistory(docId);
    return (history?.versions ?? [])
      .map((v) => ({
        version: v.version,
        editedBy: v.edited_by,
        editedAt: v.published_at ?? v.edited_at,
        note: v.note ?? null,
      }))
      .sort((a, b) => b.version - a.version);
  } catch (err) {
    console.warn(`[vault-ui] could not read history for ${docId}:`, (err as Error).message);
    return [];
  }
}

/** A past version's content, or null when it can't be reconstructed. */
export async function loadVersionSnapshot(
  storage: NestStorage,
  docId: string,
  version: number,
): Promise<DocSnapshot | null> {
  try {
    const raw = await new VersionManager(storage).reconstructVersion(docId, version);
    return parseSnapshot(docId, raw);
  } catch (err) {
    console.warn(`[vault-ui] could not reconstruct ${docId} v${version}:`, (err as Error).message);
    return null;
  }
}
