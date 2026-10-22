import type { Editor } from '@tiptap/core';

/**
 * Point the link under the cursor, or the selected text, at `href`. `text` is what
 * the link should read: when it differs from the existing text that text is replaced,
 * and when omitted the existing text is kept. With nothing selected and no link under
 * the cursor, `text` (or the href) is inserted as a new link.
 */
export function applyLink(editor: Editor, href: string, text?: string) {
  if (editor.isActive('link')) editor.chain().focus().extendMarkRange('link').run();
  const { from, to, empty } = editor.state.selection;
  const current = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
  const next = text?.trim();
  const chain = editor.chain().focus();
  if (empty || (next && next !== current)) {
    chain.insertContent({ type: 'text', text: next || href, marks: [{ type: 'link', attrs: { href } }] }).run();
  } else {
    chain.setLink({ href }).run();
  }
}

export function removeLink(editor: Editor) {
  editor.chain().focus().extendMarkRange('link').unsetLink().run();
}

/** The href of the link under the cursor, or '' when there isn't one. */
export function currentHref(editor: Editor): string {
  return editor.isActive('link') ? ((editor.getAttributes('link').href as string | undefined) ?? '') : '';
}

/** The text of the link under the cursor, or of the selection, or '' when there is neither. */
export function currentLinkText(editor: Editor): string {
  if (editor.isActive('link')) editor.chain().extendMarkRange('link').run();
  const { from, to, empty } = editor.state.selection;
  return empty ? '' : editor.state.doc.textBetween(from, to, ' ');
}
