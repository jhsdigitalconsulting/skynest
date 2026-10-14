'use client';

import type { Editor } from '@tiptap/core';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useEditorState } from '@tiptap/react';
import { Icon } from '../../../Icon';
import { ACTIONS, TABLE_ACTIONS, headingLevel, isActive, setHeading } from './actions';
import type { VisualAction, VisualDialog } from './actions';
import { HeadingSelect } from './HeadingSelect';
import { useShortcutLabel } from '../../../useShortcutLabel';

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

interface ToolbarState {
  actions: Record<string, ActionState>;
  heading: number;
  inTable: boolean;
}

export function VisualToolbar({ editor, disabled, onOpenDialog }: VisualToolbarProps) {
  const keys = useShortcutLabel();
  // Re-render on every transaction so active and undo/redo states follow the editor.
  const view = useEditorState({
    editor,
    selector: ({ editor: e }): ToolbarState =>
      e
        ? {
            actions: Object.fromEntries(
              [...ACTIONS.flat(), ...TABLE_ACTIONS].map((a) => [
                a.key,
                { on: isActive(e, a.active), enabled: a.enabled ? a.enabled(e) : true },
              ]),
            ),
            heading: headingLevel(e),
            inTable: e.isActive('table'),
          }
        : { actions: {}, heading: 0, inTable: false },
  });
  const state = view?.actions;
  const groups = view?.inTable ? [...ACTIONS, TABLE_ACTIONS] : ACTIONS;

  // Roving tabindex: the toolbar is a single tab stop, so Tab goes on to the editor body.
  // Arrow keys move between buttons.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isEnabled = (key: string) => !disabled && !!editor && (state?.[key]?.enabled ?? true);
  const allKeys = groups.flat().map((a) => a.key);
  const tabStop = focusKey && isEnabled(focusKey) ? focusKey : allKeys.find(isEnabled);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(toolbarRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = (at + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (at - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next].focus();
  };

  return (
    <div ref={toolbarRef} onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Formatting">
      <HeadingSelect
        level={view?.heading ?? 0}
        disabled={!!disabled || !editor}
        onChange={(level) => editor && setHeading(editor, level)}
      />
      {groups.map((group, gi) => (
        <div
          key={gi}
          className="flex items-center gap-0.5"
          role={group === TABLE_ACTIONS ? 'group' : undefined}
          aria-label={group === TABLE_ACTIONS ? 'Table' : undefined}
        >
          <span className="mx-1 h-5 w-px bg-gray-200" />
          {group.map((action: VisualAction) => {
            const { on, enabled } = state?.[action.key] ?? { on: false, enabled: true };
            return (
              <button
                key={action.key}
                type="button"
                disabled={disabled || !editor || !enabled}
                tabIndex={action.key === tabStop ? 0 : -1}
                onFocus={() => setFocusKey(action.key)}
                // Keep focus (and the selection) in the editor.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor && action.run(editor, onOpenDialog)}
                title={action.shortcut ? `${action.label} (${keys(action.shortcut)})` : action.label}
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
