'use client';

import { useState } from 'react';
import { Icon } from '../Icon';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

function clean(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

/** Chip-style tag editor: Enter or comma adds, Backspace on empty removes the last tag. */
export function TagInput({ value, onChange, disabled }: Props) {
  const [draft, setDraft] = useState('');
  const display = value.map((t) => t.replace(/^#/, ''));

  const add = (raw: string) => {
    const tags = raw.split(',').map(clean).filter(Boolean);
    const next = [...display];
    for (const t of tags) if (!next.includes(t)) next.push(t);
    if (next.length !== display.length) onChange(next.map((t) => `#${t}`));
    setDraft('');
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1 ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
      {display.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 py-0.5 pl-2 pr-1 text-xs font-medium text-indigo-700">
          #{tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(display.filter((t) => t !== tag).map((t) => `#${t}`))}
              className="rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700"
              aria-label={`Remove tag ${tag}`}
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (draft.trim()) add(draft);
          } else if (e.key === 'Backspace' && !draft && display.length) {
            onChange(display.slice(0, -1).map((t) => `#${t}`));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={display.length ? 'Add tag…' : 'Add tags — press Enter after each'}
        aria-label="Add tag"
        className="min-w-32 flex-1 border-0 bg-transparent p-1 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
      />
    </div>
  );
}
