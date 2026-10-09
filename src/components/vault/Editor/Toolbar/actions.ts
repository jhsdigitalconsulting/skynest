import type { IconName } from '../../Icon';
import { block, linePrefix, link, wrap } from '../commands';
import type { Command } from '../commands';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: IconName;
  shortcut?: string;
  command: Command;
}

const HEADING = /^#{1,6}\s+/;
const BULLET = /^\s*([-*+]|\d+[.)])(\s+\[[ xX]\])?\s+/;

export const TOOLBAR_ACTIONS: ToolbarAction[][] = [
  [
    { key: 'h', label: 'Heading', icon: 'heading', command: linePrefix('## ', HEADING) },
    { key: 'b', label: 'Bold', icon: 'bold', shortcut: '⌘B', command: wrap('**', '**', 'bold text') },
    { key: 'i', label: 'Italic', icon: 'italic', shortcut: '⌘I', command: wrap('_', '_', 'italic text') },
    { key: 's', label: 'Strikethrough', icon: 'strike', command: wrap('~~', '~~', 'struck text') },
    { key: 'k', label: 'Link to a web page', icon: 'link', shortcut: '⌘K', command: link() },
  ],
  [
    { key: 'ul', label: 'Bulleted list', icon: 'list', command: linePrefix('- ', BULLET) },
    { key: 'ol', label: 'Numbered list', icon: 'listOrdered', command: linePrefix((i) => `${i + 1}. `, BULLET) },
    { key: 'task', label: 'Checklist', icon: 'checkSquare', command: linePrefix('- [ ] ', BULLET) },
    { key: 'quote', label: 'Quote', icon: 'quote', command: linePrefix('> ', /^>\s?/) },
  ],
  [
    { key: 'code', label: 'Inline code', icon: 'code', shortcut: '⌘E', command: wrap('`', '`', 'code') },
    { key: 'codeblock', label: 'Code block', icon: 'command', command: block('```\ncode\n```', 'code') },
    {
      key: 'table',
      label: 'Table',
      icon: 'table',
      command: block('| Column | Column |\n| ------ | ------ |\n| Cell   | Cell   |', 'Column'),
    },
  ],
];

/** Keyboard shortcuts (⌘/Ctrl + key) handled by the editor. */
export const SHORTCUTS: Record<string, Command> = {
  b: TOOLBAR_ACTIONS[0][1].command,
  i: TOOLBAR_ACTIONS[0][2].command,
  k: TOOLBAR_ACTIONS[0][4].command,
  e: TOOLBAR_ACTIONS[2][0].command,
};
