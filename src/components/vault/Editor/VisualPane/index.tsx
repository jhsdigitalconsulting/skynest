'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { contextnestHref, resolveVaultHref } from '@/lib/vault-ui/wikilinks';
import type { LinkTarget } from '@/lib/vault-ui/wikilinks';
import { titleOf } from '../dialogs/DocLinkDialog/search';
import { PROSE_CLASS, assetSrc } from '../../Markdown';
import type { VaultLinks } from '../../Markdown';
import { applyGentleEscaping, visualExtensions } from './extensions';
import { docSlash } from './doc-slash';
import type { DocSlashBridge, DocSlashState } from './doc-slash';
import { DocSlashMenu } from './DocSlashMenu';
import type { DocSlashMenuHandle } from './DocSlashMenu';
import { LinkContextMenu } from './LinkContextMenu';
import type { LinkMenuState } from './LinkContextMenu';
import { removeLink } from './linking';
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
  const [linkMenu, setLinkMenu] = useState<LinkMenuState | null>(null);
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

  // The `/` document search: the extension reports what's typed, the menu handles the keys.
  const [slash, setSlash] = useState<DocSlashState | null>(null);
  const slashMenu = useRef<DocSlashMenuHandle>(null);
  const slashBridge = useRef<DocSlashBridge | null>(null);
  slashBridge.current = {
    onChange: setSlash,
    onKeyDown: (event) => slashMenu.current?.onKeyDown(event) ?? false,
  };

  const editor = useEditor({
    extensions: [
      ...visualExtensions('Start writing… Type / to link a document.', (src) => assetSrc(src, linksRef.current.vaultId)),
      docSlash(slashBridge),
    ],
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      // Keep the cursor clear of the sticky header + toolbar above and the action bar below.
      scrollMargin: { top: 128, bottom: 96, left: 0, right: 0 },
      scrollThreshold: { top: 128, bottom: 96, left: 0, right: 0 },
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
      handleDOMEvents: {
        // Right-clicking a link offers to edit it; elsewhere the browser's own menu stays.
        contextmenu: (view, event) => {
          const href = (event.target as HTMLElement).closest('a')?.getAttribute('href');
          if (!href || !view.editable) return false;
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (at) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, at.pos)));
          event.preventDefault();
          setLinkMenu({ x: event.clientX, y: event.clientY, href });
          return true;
        },
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

  const pickSlash = (doc: LinkTarget) => {
    if (!editor || !slash) return;
    const href = contextnestHref(doc.id);
    editor
      .chain()
      .focus()
      .deleteRange(slash.range)
      .insertContent([
        { type: 'text', text: titleOf(doc), marks: [{ type: 'link', attrs: { href } }] },
        { type: 'text', text: ' ' },
      ])
      .run();
  };

  return (
    <div className="overflow-clip rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      {/* Upload progress rides with the sticky toolbar so it stays visible while scrolled down the page. */}
      <div className="sticky top-14 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
          <VisualToolbar editor={editor} disabled={disabled} onOpenDialog={setDialog} />
          {controls}
        </div>
        <UploadStatus status={media.status} onDismiss={media.clearStatus} onCancel={media.cancel} />
      </div>
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[480px] px-6 py-5 text-sm text-gray-400 sm:px-8">Loading editor…</div>
      )}
      {editor && slash && <DocSlashMenu ref={slashMenu} state={slash} docs={links.index.docs} onPick={pickSlash} />}
      {editor && linkMenu && (
        <LinkContextMenu
          state={linkMenu}
          onClose={() => setLinkMenu(null)}
          onEdit={() => {
            setLinkMenu(null);
            setDialog('url');
          }}
          onOpen={() => {
            setLinkMenu(null);
            const url = linkDestination(linkMenu.href, linksRef.current);
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
          onRemove={() => {
            setLinkMenu(null);
            removeLink(editor);
          }}
        />
      )}
      {editor && dialog && (
        <VisualDialogs editor={editor} dialog={dialog} docs={links.index.docs} vaultId={links.vaultId} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
