'use client';

import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Icon } from '../../../Icon';
import { ACTIONS, isActive } from './actions';
import type { VisualDialog } from './actions';

export type { VisualDialog } from './actions';

export interface VisualToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
  onOpenDialog: (dialog: VisualDialog) => void;
}

interface ActionState {
  on: boolean;
  enabled: boolean;
}

export function VisualToolbar({ editor, disabled, onOpenDialog }: VisualToolbarProps) {
  // Re-render on every transaction so active and undo/redo states follow the editor.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }): Record<string, ActionState> =>
      e
        ? Object.fromEntries(
            ACTIONS.flat().map((a) => [a.key, { on: isActive(e, a.active), enabled: a.enabled ? a.enabled(e) : true }]),
          )
        : {},
  });

  return (
    <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
      {ACTIONS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1 h-5 w-px bg-gray-200" />}
          {group.map((action) => {
            const { on, enabled } = state?.[action.key] ?? { on: false, enabled: true };
            return (
              <button
                key={action.key}
                type="button"
                disabled={disabled || !editor || !enabled}
                // Keep focus (and the selection) in the editor.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor && action.run(editor, onOpenDialog)}
                title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                aria-label={action.label}
                aria-pressed={action.active ? on : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1 disabled:opacity-40 ${
                  on ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {action.icon ? (
                  <Icon name={action.icon} className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{action.text}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
