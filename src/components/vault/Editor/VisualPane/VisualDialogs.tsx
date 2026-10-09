'use client';

import type { Editor } from '@tiptap/core';
import { contextnestHref } from '@/lib/vault-ui/wikilinks';
import type { LinkTarget } from '@/lib/vault-ui/wikilinks';
import { DocLinkDialog, titleOf } from '../dialogs/DocLinkDialog';
import { MediaDialog } from '../dialogs/MediaDialog';
import { UrlLinkDialog } from '../dialogs/UrlLinkDialog';
import { applyLink, currentHref, removeLink } from './linking';
import { altFromName, insertAsset } from './media';
import type { VisualDialog } from './VisualToolbar';

interface Props {
  editor: Editor;
  dialog: VisualDialog | null;
  docs: LinkTarget[];
  vaultId: string;
  onClose: () => void;
}

/** The link and media dialogs, applying their result to the editor. */
export function VisualDialogs({ editor, dialog, docs, vaultId, onClose }: Props) {
  const done = (apply: () => void) => {
    onClose();
    apply();
  };

  if (dialog === 'doc') {
    return (
      <DocLinkDialog
        docs={docs}
        onClose={() => done(() => editor.commands.focus())}
        onPick={(doc) => done(() => applyLink(editor, contextnestHref(doc.id), titleOf(doc)))}
      />
    );
  }
  if (dialog === 'url') {
    const href = currentHref(editor);
    return (
      <UrlLinkDialog
        initialHref={href.startsWith('contextnest://') ? '' : href}
        askText={editor.state.selection.empty && !href}
        onClose={() => done(() => editor.commands.focus())}
        onSubmit={(url, text) => done(() => applyLink(editor, url, text))}
        onRemove={() => done(() => removeLink(editor))}
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
