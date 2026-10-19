import type { FolderNode } from "./types";
import { slugify } from "../components/Editor/PathField";

export type FolderPathResult =
  { ok: true; path: string } | { ok: false; error: string };

/**
 * Turns what someone typed into a full folder path under `parent`. Each
 * `/`-separated segment is slugified, so "Q4 Plans/2026" becomes "q4-plans/2026".
 */
export function resolveNewFolderPath(
  parent: string,
  input: string,
  existing: string[],
): FolderPathResult {
  const segments = input
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0)
    return { ok: false, error: "Enter a folder name." };
  if (segments.some((s) => s === "." || s === ".."))
    return { ok: false, error: 'Folder names can’t contain "." or "..".' };
  const slugs = segments.map(slugify);
  if (slugs.some((s) => !s))
    return { ok: false, error: "Use letters or numbers in each folder name." };
  const path = [parent, ...slugs].filter(Boolean).join("/");
  if (existing.includes(path))
    return { ok: false, error: `“${path}” already exists.` };
  return { ok: true, path };
}

/** Every folder path in the tree, for spotting duplicates. */
export function flattenFolders(node: FolderNode): string[] {
  return node.children.flatMap((c) => [c.path, ...flattenFolders(c)]);
}
