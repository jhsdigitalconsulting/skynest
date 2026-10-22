'use client';

import type { Editor } from '@tiptap/core';
import { contextnestHref } from '../../../lib/wikilinks';
import type { LinkTarget } from '../../../lib/wikilinks';
import { DocLinkDialog, titleOf } from '../dialogs/DocLinkDialog';
import { MediaDialog } from '../dialogs/MediaDialog';
import { TableDialog } from '../dialogs/TableDialog';
import { UrlLinkDialog } from '../dialogs/UrlLinkDialog';
import { applyLink, currentHref, currentLinkText, removeLink } from './linking';
import { altFromName, insertAsset } from './media';
import type { VisualDialog } from './VisualToolbar';

interface Props {
  editor: Editor;
  dialog: VisualDialog | null;
  docs: LinkTarget[];
  vaultId: string;
  onClose: () => void;
}

/** The link, table and media dialogs, applying their result to the editor. */
export function VisualDialogs({ editor, dialog, docs, vaultId, onClose }: Props) {
  const done = (apply: () => void) => {
    onClose();
    apply();
  };

  const href = currentHref(editor);
  // ⌘K on a link to a document edits it with the document picker, not as a URL.
  if (dialog === 'doc' || (dialog === 'url' && href.startsWith('contextnest://'))) {
    return (
      <DocLinkDialog
        docs={docs}
        initialText={currentLinkText(editor)}
        editing={Boolean(href)}
        onClose={() => done(() => editor.commands.focus())}
        onPick={(doc, text) => done(() => applyLink(editor, contextnestHref(doc.id), text || titleOf(doc)))}
      />
    );
  }
  if (dialog === 'url') {
    return (
      <UrlLinkDialog
        initialHref={href}
        initialText={currentLinkText(editor)}
        onClose={() => done(() => editor.commands.focus())}
        onSubmit={(url, text) => done(() => applyLink(editor, url, text))}
        onRemove={() => done(() => removeLink(editor))}
      />
    );
  }
  if (dialog === 'table') {
    return (
      <TableDialog
        onClose={() => done(() => editor.commands.focus())}
        onSubmit={(rows, cols) => done(() => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run())}
      />
    );
  }
  if (dialog === 'image') {
    return (
      <MediaDialog
        vaultId={vaultId}
        onClose={() => done(() => editor.commands.focus())}
        onInsertUrl={(src, alt) => done(() => editor.chain().focus().setImage({ src, alt }).run())}
        onUploaded={(asset, alt) => done(() => insertAsset(editor, asset, alt || altFromName(asset.file)))}
      />
    );
  }
  return null;
}
