import type { Editor } from '@tiptap/core';

/**
 * Point the link under the cursor, or the selected text, at `href`. With nothing
 * selected and no link under the cursor, insert `text` as a new link.
 */
export function applyLink(editor: Editor, href: string, text: string) {
  const chain = editor.chain().focus();
  if (editor.isActive('link')) {
    chain.extendMarkRange('link').setLink({ href }).run();
  } else if (editor.state.selection.empty) {
    chain.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }).run();
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
