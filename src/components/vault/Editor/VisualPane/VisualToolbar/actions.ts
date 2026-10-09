import type { Editor } from '@tiptap/core';
import type { IconName } from '../../../Icon';

/** The dialogs the toolbar can open. */
export type VisualDialog = 'url' | 'doc' | 'image';

export interface VisualAction {
  key: string;
  label: string;
  /** An icon, or `text` for buttons labelled with a few letters (H1–H6). */
  icon?: IconName;
  text?: string;
  shortcut?: string;
  /** Mark or node name for the active state, when the action toggles one. */
  active?: string | [string, Record<string, unknown>];
  /** Whether the action can run right now (undo/redo). */
  enabled?: (editor: Editor) => boolean;
  run: (editor: Editor, open: (dialog: VisualDialog) => void) => void;
}

const HEADINGS = [1, 2, 3, 4, 5, 6] as const;

export const ACTIONS: VisualAction[][] = [
  [
    { key: 'b', label: 'Bold', icon: 'bold', shortcut: '⌘B', active: 'bold', run: (e) => e.chain().focus().toggleBold().run() },
    { key: 'i', label: 'Italic', icon: 'italic', shortcut: '⌘I', active: 'italic', run: (e) => e.chain().focus().toggleItalic().run() },
    {
      key: 's',
      label: 'Strikethrough',
      icon: 'strike',
      shortcut: '⌘⇧S',
      active: 'strike',
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  HEADINGS.map((level) => ({
    key: `h${level}`,
    label: `Heading ${level}`,
    text: `H${level}`,
    active: ['heading', { level }] as [string, Record<string, unknown>],
    run: (e: Editor) => e.chain().focus().toggleHeading({ level }).run(),
  })),
  [
    { key: 'ul', label: 'Bulleted list', icon: 'list', active: 'bulletList', run: (e) => e.chain().focus().toggleBulletList().run() },
    {
      key: 'ol',
      label: 'Numbered list',
      icon: 'listOrdered',
      active: 'orderedList',
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    { key: 'task', label: 'Checklist', icon: 'checkSquare', active: 'taskList', run: (e) => e.chain().focus().toggleTaskList().run() },
    { key: 'quote', label: 'Quote', icon: 'quote', active: 'blockquote', run: (e) => e.chain().focus().toggleBlockquote().run() },
    { key: 'code', label: 'Inline code', icon: 'code', shortcut: '⌘E', active: 'code', run: (e) => e.chain().focus().toggleCode().run() },
    { key: 'codeblock', label: 'Code block', icon: 'command', active: 'codeBlock', run: (e) => e.chain().focus().toggleCodeBlock().run() },
    {
      key: 'table',
      label: 'Table',
      icon: 'table',
      active: 'table',
      run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
    },
  ],
  [{ key: 'image', label: 'Image or video', icon: 'image', active: 'image', run: (_e, open) => open('image') }],
  [
    { key: 'link', label: 'Link to a web page', icon: 'link', shortcut: '⌘K', run: (_e, open) => open('url') },
    { key: 'doc', label: 'Link to a document', icon: 'fileLink', shortcut: '⌘⇧K', run: (_e, open) => open('doc') },
  ],
  [
    { key: 'undo', label: 'Undo', icon: 'undo', shortcut: '⌘Z', enabled: (e) => e.can().undo(), run: (e) => e.chain().focus().undo().run() },
    { key: 'redo', label: 'Redo', icon: 'redo', shortcut: '⌘⇧Z', enabled: (e) => e.can().redo(), run: (e) => e.chain().focus().redo().run() },
  ],
];

export function isActive(editor: Editor, active: VisualAction['active']): boolean {
  if (!active) return false;
  return typeof active === 'string' ? editor.isActive(active) : editor.isActive(active[0], active[1]);
}
