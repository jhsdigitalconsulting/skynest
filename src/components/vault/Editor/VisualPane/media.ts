import type { Editor } from '@tiptap/core';
import { isVideoName } from '@/lib/vault-ui/assets';
import type { UploadedAsset } from '@/lib/vault-ui/assets';

/**
 * Insert an uploaded asset the way ContextNest Community writes it: an image as
 * an inline image, a video as its URL alone in a paragraph (shown as a player).
 */
export function insertAsset(editor: Editor, asset: UploadedAsset, alt: string, at?: number) {
  const chain = editor.chain().focus(at);
  if (isVideoName(asset.file)) {
    chain.insertContent({ type: 'paragraph', content: [{ type: 'text', text: asset.url }] }).run();
  } else {
    chain.setImage({ src: asset.url, alt }).run();
  }
}

/** Alt text from a file name: `team-photo.png` → `team-photo`. */
export function altFromName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
}
