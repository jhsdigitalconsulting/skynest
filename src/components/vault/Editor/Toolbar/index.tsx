'use client';

import { Icon } from '../../Icon';
import type { Command } from '../commands';
import { TOOLBAR_ACTIONS } from './actions';

export { SHORTCUTS, TOOLBAR_ACTIONS } from './actions';
export type { ToolbarAction } from './actions';

export interface ToolbarProps {
  onCommand: (command: Command) => void;
  /** Opens the document picker; the button only shows when it's given. */
  onDocLink?: () => void;
  disabled?: boolean;
}

const BUTTON_CLASS =
  'flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40';

export function Toolbar({ onCommand, onDocLink, disabled }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
      {TOOLBAR_ACTIONS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1 h-5 w-px bg-gray-200" />}
          {group.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              // Keep focus (and the selection) in the textarea.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommand(action.command)}
              title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              aria-label={action.label}
              className={BUTTON_CLASS}
            >
              <Icon name={action.icon} className="h-4 w-4" />
            </button>
          ))}
          {gi === 0 && onDocLink && (
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onDocLink}
              title="Link to a document (⌘⇧K)"
              aria-label="Link to a document"
              className={BUTTON_CLASS}
            >
              <Icon name="fileLink" className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
