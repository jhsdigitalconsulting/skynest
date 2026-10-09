'use client';

import { useRef, useState } from 'react';
import { ACCEPT } from '@/lib/vault-ui/assets';
import { mediaFiles } from '@/lib/vault-ui/upload';

interface Props {
  busy: boolean;
  onFile: (file: File) => void;
}

/** Click to choose, or drop, an image or video. */
export function DropZone({ busy, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (files: FileList | null) => {
    const [file] = mediaFiles(files);
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) take(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm ${
        over ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
      }`}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
      >
        {busy ? 'Uploading…' : 'Choose a file'}
      </button>
      <span className="text-gray-500">or drop it here · PNG, JPG, GIF, WebP up to 10 MB · MP4, WebM up to 30 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
