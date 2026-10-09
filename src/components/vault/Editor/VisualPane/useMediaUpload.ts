'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { mediaFiles, uploadAsset } from '@/lib/vault-ui/upload';
import { altFromName, insertAsset } from './media';

/**
 * Upload images and videos pasted or dropped into the editor, then insert them
 * where they landed. `status` describes an upload in progress or one that failed.
 */
export function useMediaUpload(vaultId: string) {
  const [status, setStatus] = useState<{ busy: boolean; message: string } | null>(null);
  const vaultIdRef = useRef(vaultId);
  useEffect(() => {
    vaultIdRef.current = vaultId;
  }, [vaultId]);
  const editorRef = useRef<Editor | null>(null);

  const uploadAll = useCallback(async (files: File[], at?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    for (const file of files) {
      setStatus({ busy: true, message: `Uploading ${file.name}…` });
      try {
        const asset = await uploadAsset(vaultIdRef.current, file);
        insertAsset(editor, asset, altFromName(file.name), at);
        at = undefined;
      } catch (err) {
        setStatus({ busy: false, message: err instanceof Error ? err.message : 'Upload failed.' });
        return;
      }
    }
    setStatus(null);
  }, []);

  const handlePaste = useCallback(
    (_view: EditorView, event: ClipboardEvent) => {
      const files = mediaFiles(event.clipboardData?.files);
      if (!files.length) return false;
      event.preventDefault();
      void uploadAll(files);
      return true;
    },
    [uploadAll],
  );

  const handleDrop = useCallback(
    (view: EditorView, event: DragEvent) => {
      const files = mediaFiles(event.dataTransfer?.files);
      if (!files.length) return false;
      event.preventDefault();
      const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
      void uploadAll(files, at);
      return true;
    },
    [uploadAll],
  );

  return { editorRef, status, clearStatus: () => setStatus(null), handlePaste, handleDrop };
}
