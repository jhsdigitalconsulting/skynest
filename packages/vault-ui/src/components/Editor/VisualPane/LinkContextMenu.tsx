'use client';

import { ContextMenu } from './ContextMenu';

/** Where the menu opened, and the link it's for. */
export interface LinkMenuState {
  x: number;
  y: number;
  href: string;
}

interface Props {
  state: LinkMenuState;
  onEdit: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/** The right-click menu on a link in the visual editor. */
export function LinkContextMenu({ state, onEdit, onOpen, onRemove, onClose }: Props) {
  return (
    <ContextMenu
      x={state.x}
      y={state.y}
      label="Link actions"
      onClose={onClose}
      items={[
        { icon: 'edit', label: 'Edit link', onClick: onEdit },
        { icon: 'link', label: 'Open link', onClick: onOpen },
        { icon: 'trash', label: 'Remove link', onClick: onRemove },
      ]}
    />
  );
}
