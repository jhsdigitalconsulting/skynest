'use client';

import { useState } from 'react';
import type { UploadedAsset } from '@/lib/vault-ui/assets';
import { uploadAsset } from '@/lib/vault-ui/upload';
import { Dialog } from '../../../Dialog';
import { buttonClass } from '../../../button-styles';
import { normalizeHref } from '../UrlLinkDialog';
import { DropZone } from './DropZone';

/** Mount only while open. */
export interface MediaDialogProps {
  vaultId: string;
  onClose: () => void;
  /** An image embedded from a URL. */
  onInsertUrl: (src: string, alt: string) => void;
  /** An image or video uploaded to the vault. `alt` is empty when the user gave none. */
  onUploaded: (asset: UploadedAsset, alt: string) => void;
}

const INPUT_CLASS =
  'mt-1 h-10 w-full rounded-lg border-0 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-500';

/** Upload an image or video into the vault, or embed an image from a URL. */
export function MediaDialog({ vaultId, onClose, onInsertUrl, onUploaded }: MediaDialogProps) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadAsset(vaultId, file), alt.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeHref(src);
    if (url && !busy) onInsertUrl(url, alt.trim());
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Insert an image or video"
      description="Uploads are saved in the vault's assets folder, where ContextNest Community finds them too."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="submit" form="media-form" disabled={!src.trim() || busy} className={buttonClass('primary')}>
            Embed URL
          </button>
        </>
      }
    >
      <form id="media-form" onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Alt text <span className="font-normal text-gray-400">(images)</span>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image for readers and agents"
            className={INPUT_CLASS}
          />
        </label>
        <DropZone busy={busy} onFile={upload} />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-gray-700">
          Or embed an image from a URL
          <input
            type="text"
            inputMode="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://example.com/diagram.png"
            className={INPUT_CLASS}
          />
        </label>
      </form>
    </Dialog>
  );
}
