'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { UploadCancelled, mediaFiles, uploadAsset } from '../../../lib/upload';
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
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const uploadAll = useCallback(async (files: File[], at?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    for (const file of files) {
      setStatus({ busy: true, message: `Uploading ${file.name}…` });
      try {
        const asset = await uploadAsset(vaultIdRef.current, file, current.signal);
        insertAsset(editor, asset, altFromName(file.name), at);
        at = undefined;
      } catch (err) {
        // Cancelled: whoever cancelled has already cleared the status.
        if (err instanceof UploadCancelled) return;
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

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setStatus(null);
  }, []);

  return { editorRef, status, clearStatus: () => setStatus(null), cancel, handlePaste, handleDrop };
}
