'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { resolveVaultHref } from '@/lib/vault-ui/wikilinks';
import { PROSE_CLASS, assetSrc } from '../../Markdown';
import type { VaultLinks } from '../../Markdown';
import { applyGentleEscaping, visualExtensions } from './extensions';
import { loadMarkdown, toMarkdown } from './markdown-sync';
import type { SourceMap } from './markdown-sync';
import { VisualDialogs } from './VisualDialogs';
import { VisualToolbar } from './VisualToolbar';
import { UploadStatus } from './UploadStatus';
import { useMediaUpload } from './useMediaUpload';
import type { VisualDialog } from './VisualToolbar';

export interface VisualPaneProps {
  /** The document body as markdown. Edits come back as markdown too. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Rendered at the end of the toolbar row (the mode switch). */
  controls: ReactNode;
  /** The vault's documents, for document links. */
  links: VaultLinks;
}

/** Where a link in the editor goes when ⌘/Ctrl-clicked: the vault page for document links. */
function linkDestination(href: string, links: VaultLinks): string | null {
  const docId = resolveVaultHref(href, links.index);
  if (docId === undefined) return href;
  return docId ? vaultUrls(links.vaultId).doc(docId) : null;
}

/**
 * WYSIWYG editing of a markdown body. Blocks the user doesn't touch are written
 * back byte-for-byte (see markdown-sync), so a small edit stays a small diff.
 */
export function VisualPane({ value, onChange, disabled, controls, links }: VisualPaneProps) {
  const [dialog, setDialog] = useState<VisualDialog | null>(null);
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);
  const sourceMap = useRef<SourceMap | null>(null);
  // The markdown the editor last produced, to tell our own updates from outside changes.
  const emitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const media = useMediaUpload(links.vaultId);

  const editor = useEditor({
    extensions: visualExtensions('Start writing…', (src) => assetSrc(src, linksRef.current.vaultId)),
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `${PROSE_CLASS} visual-editor min-h-[480px] px-6 py-5 sm:px-8 focus:outline-none`,
        'aria-label': 'Document body',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handlePaste: media.handlePaste,
      handleDrop: media.handleDrop,
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setDialog(event.shiftKey ? 'doc' : 'url');
          return true;
        }
        return false;
      },
      // Links don't navigate while editing; ⌘/Ctrl-click opens them in a new tab.
      handleClick: (_view, _pos, event) => {
        const anchor = (event.target as HTMLElement).closest('a');
        const href = anchor?.getAttribute('href');
        if (!href || !(event.metaKey || event.ctrlKey)) return false;
        const url = linkDestination(href, linksRef.current);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
    onCreate: ({ editor: e }) => applyGentleEscaping(e),
    onUpdate: ({ editor: e }) => {
      if (!sourceMap.current) return;
      const markdown = toMarkdown(e, sourceMap.current);
      emitted.current = markdown;
      onChangeRef.current(markdown);
    },
  });
  // Load the body on mount, and again whenever it changes from outside the editor.
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    sourceMap.current = loadMarkdown(editor, value);
    emitted.current = value;
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    media.editorRef.current = editor;
  }, [editor, media.editorRef]);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-2 py-1.5 backdrop-blur">
        <VisualToolbar editor={editor} disabled={disabled} onOpenDialog={setDialog} />
        {controls}
      </div>
      <UploadStatus status={media.status} onDismiss={media.clearStatus} />
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[480px] px-6 py-5 text-sm text-gray-400 sm:px-8">Loading editor…</div>
      )}
      {editor && dialog && (
        <VisualDialogs editor={editor} dialog={dialog} docs={links.index.docs} vaultId={links.vaultId} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
