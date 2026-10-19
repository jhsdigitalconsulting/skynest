import { uploadProblem } from './assets';
import type { UploadedAsset } from './assets';
import { vaultUrls } from './paths';

/** The error an upload rejects with after its signal is aborted. */
export class UploadCancelled extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadCancelled';
  }
}

/**
 * Upload an image or video to a vault. Throws an Error with a message fit to show
 * the user, or UploadCancelled when `signal` is aborted.
 */
export async function uploadAsset(vaultId: string, file: File, signal?: AbortSignal): Promise<UploadedAsset> {
  const problem = uploadProblem(file.name, file.size);
  if (problem) throw new Error(problem);
  const body = new FormData();
  body.append('file', file);
  let res: Response;
  try {
    res = await fetch(`${vaultUrls(vaultId).root}/assets`, { method: 'POST', body, signal });
  } catch {
    if (signal?.aborted) throw new UploadCancelled();
    throw new Error("Couldn't reach the server to upload that file.");
  }
  if (res.status === 413) throw new Error('That file is too large for this server to accept.');
  const data = (await res.json().catch(() => null)) as (UploadedAsset & { error?: string }) | null;
  if (signal?.aborted) throw new UploadCancelled();
  if (!res.ok || !data?.url) throw new Error(data?.error ?? `Upload failed (${res.status}).`);
  return data;
}

/** The image and video files in a paste or drop. */
export function mediaFiles(files: FileList | null | undefined): File[] {
  return Array.from(files ?? []).filter((f) => /^(image|video)\//.test(f.type));
}
