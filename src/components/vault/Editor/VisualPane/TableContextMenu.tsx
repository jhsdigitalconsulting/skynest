'use client';

import type { Editor } from '@tiptap/react';
import { ContextMenu } from './ContextMenu';

/** Where the menu opened. */
export interface TableMenuState {
  x: number;
  y: number;
}

interface Props {
  editor: Editor;
  state: TableMenuState;
  onClose: () => void;
}

/** The right-click menu inside a table: add or remove the row and column under the cursor. */
export function TableContextMenu({ editor, state, onClose }: Props) {
  const run = (command: () => boolean) => () => {
    onClose();
    command();
  };
  // The header row stays first, so nothing is added above it and it can't be removed.
  const inHeader = editor.isActive('tableHeader');
  const chain = () => editor.chain().focus();
  return (
    <ContextMenu
      x={state.x}
      y={state.y}
      label="Table actions"
      onClose={onClose}
      items={[
        { icon: 'rows', label: 'Insert row above', disabled: inHeader, onClick: run(() => chain().addRowBefore().run()) },
        { icon: 'rows', label: 'Insert row below', onClick: run(() => chain().addRowAfter().run()) },
        { icon: 'columns', label: 'Insert column left', onClick: run(() => chain().addColumnBefore().run()) },
        { icon: 'columns', label: 'Insert column right', onClick: run(() => chain().addColumnAfter().run()) },
        { icon: 'trash', label: 'Delete row', disabled: inHeader, onClick: run(() => chain().deleteRow().run()) },
        { icon: 'trash', label: 'Delete column', onClick: run(() => chain().deleteColumn().run()) },
        { icon: 'trash', label: 'Delete table', onClick: run(() => chain().deleteTable().run()) },
      ]}
    />
  );
}
