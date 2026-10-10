import type { DraftStatus } from '@/lib/review/types';

/** A document as shown in lists — serializable for client components. */
export interface DocListItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  version: number | null;
  tags: string[];
  updatedAt: string | null;
  folder: string;
  draftStatus: DraftStatus | null;
  excerpt?: string | null;
}

export interface FolderNode {
  name: string;
  path: string;
  /** Documents in this folder and everything beneath it. */
  count: number;
  children: FolderNode[];
}

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string; revision?: number }
  | { ok: false; error: string; code?: string };

/** The editable fields of a document, as the editor sends them. */
export interface EditorFields {
  title: string;
  description: string;
  tags: string[];
  type: string;
  body: string;
}

/** The reviewable parts of a document, for diffs and previews. */
export interface DocSnapshot {
  title: string;
  description: string;
  tags: string[];
  type: string;
  body: string;
}

export interface VersionItem {
  version: number;
  editedBy: string;
  editedAt: string;
  note: string | null;
}
