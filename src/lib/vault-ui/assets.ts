/**
 * Images and videos stored in a vault, in the same layout as ContextNest
 * Community so both UIs can share a vault: files live at `assets/<uuid>.<ext>`
 * and documents reference them as `/nests/<nestId>/assets/<file>` — an image as
 * `![name](url)`, a video as the bare URL on its own line.
 *
 * The nest id in a reference is the server that wrote it, so when rendering we
 * only trust the file name and serve it from the vault being viewed.
 */

export const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;
export const VIDEO_EXTS = ['mp4', 'webm'] as const;

export const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

/** For the file picker's `accept`. */
export const ACCEPT = Object.values(CONTENT_TYPES).filter((t, i, all) => all.indexOf(t) === i).join(',');

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 30 * 1024 * 1024;

/** A stored asset's file name, as Community names them. */
export const ASSET_NAME_RE = /^[0-9a-f-]{36}\.(png|jpe?g|gif|webp|mp4|webm)$/;
const ASSET_URL_RE = /^\/nests\/[^/]+\/assets\/([0-9a-f-]{36}\.(?:png|jpe?g|gif|webp|mp4|webm))$/;

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isVideoName(name: string): boolean {
  return (VIDEO_EXTS as readonly string[]).includes(extensionOf(name));
}

/** The asset file a `/nests/<id>/assets/<file>` reference points to, or null for any other URL. */
export function assetFileFromUrl(url: string): string | null {
  return ASSET_URL_RE.exec(url.trim())?.[1] ?? null;
}

/** Why a file can't be uploaded, or null when it can. */
export function uploadProblem(name: string, size: number): string | null {
  const ext = extensionOf(name);
  if (!CONTENT_TYPES[ext]) return `".${ext}" files aren't supported — use ${Object.keys(CONTENT_TYPES).join(', ')}.`;
  const video = isVideoName(name);
  const max = video ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (size > max) {
    return `That ${video ? 'video' : 'image'} is ${(size / 1024 / 1024).toFixed(1)} MB; the limit is ${max / 1024 / 1024} MB.`;
  }
  return null;
}

export interface UploadedAsset {
  file: string;
  /** The reference to store in the document. */
  url: string;
  /** Ready-to-insert markdown: `![name](url)` for an image, the bare URL for a video. */
  markdown: string;
}
