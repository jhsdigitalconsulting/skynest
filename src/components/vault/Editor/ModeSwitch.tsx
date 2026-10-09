'use client';

import { Icon } from '../Icon';
import type { IconName } from '../Icon';

/** `visual` is WYSIWYG; `write` edits the raw markdown. */
export type EditorMode = 'visual' | 'write' | 'split' | 'preview';

const MODES: { key: EditorMode; label: string; icon: IconName; className?: string }[] = [
  { key: 'visual', label: 'Visual', icon: 'edit' },
  { key: 'write', label: 'Markdown', icon: 'code' },
  { key: 'split', label: 'Split', icon: 'columns', className: 'hidden lg:inline-flex' },
  { key: 'preview', label: 'Preview', icon: 'eye' },
];

export function ModeSwitch({ mode, onChange }: { mode: EditorMode; onChange: (m: EditorMode) => void }) {
  return (
    <div className="flex rounded-lg bg-gray-100 p-0.5" role="tablist" aria-label="Editor view">
      {MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          role="tab"
          aria-selected={mode === m.key}
          onClick={() => onChange(m.key)}
          className={`h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${m.className ?? 'inline-flex'} ${
            mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon name={m.icon} className="h-3.5 w-3.5" />
          {m.label}
        </button>
      ))}
    </div>
  );
}
