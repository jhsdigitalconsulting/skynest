'use client';

import { useId, useMemo, useState } from 'react';
import { canonicalTag, cleanTag, suggestTags } from '@/lib/vault-ui/tags';
import type { TagCount } from '@/lib/vault-ui/tags';
import { Icon } from '../Icon';
import { FIELD_FRAME } from '../field-styles';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already used in the vault, offered as suggestions so people reuse them. */
  vocabulary: TagCount[];
  disabled?: boolean;
}

/**
 * Chip-style tag editor with typeahead. Existing tags are suggested as you type
 * (↑/↓ to move, Enter or Tab to pick); Enter or comma adds what you typed, as a
 * "new" tag when the vault doesn't have it. Duplicates are ignored in any case,
 * and a tag the vault already has keeps its spelling. Backspace on an empty
 * field removes the last tag, Esc closes the list.
 */
export function TagInput({ value, onChange, vocabulary, disabled }: Props) {
  const listId = useId();
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const display = value.map((t) => t.replace(/^#/, ''));

  const suggestions = useMemo(() => suggestTags(vocabulary, display, draft), [vocabulary, display, draft]);
  const typed = cleanTag(draft);
  const isNewTag =
    !!typed && !vocabulary.some((v) => v.tag.toLowerCase() === typed.toLowerCase()) && !display.some((t) => t.toLowerCase() === typed.toLowerCase());
  const showList = open && !disabled && (suggestions.length > 0 || isNewTag);

  const add = (raw: string) => {
    const next = [...display];
    for (const part of raw.split(',')) {
      if (!cleanTag(part)) continue;
      const tag = canonicalTag(vocabulary, part);
      if (!next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    if (next.length !== display.length) onChange(next.map((t) => `#${t}`));
    setDraft('');
    setActive(-1);
  };

  // The "create" row, when shown, sits after the suggestions.
  const rows = suggestions.length + (isNewTag ? 1 : 0);

  return (
    <div className="relative">
      <div className={`flex min-h-10 flex-wrap items-center gap-1.5 px-3 py-1.5 ${FIELD_FRAME}`}>
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
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(',')) add(v);
            else setDraft(v);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              if (!rows) return;
              e.preventDefault();
              setOpen(true);
              setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % rows : (i - 1 + rows) % rows));
            } else if (e.key === 'Enter' || (e.key === 'Tab' && showList && active >= 0)) {
              e.preventDefault();
              const pick = showList && active >= 0 && active < suggestions.length ? suggestions[active].tag : draft;
              if (pick.trim()) add(pick);
            } else if (e.key === 'Escape' && showList) {
              e.preventDefault();
              setOpen(false);
            } else if (e.key === 'Backspace' && !draft && display.length) {
              onChange(display.slice(0, -1).map((t) => `#${t}`));
            }
          }}
          onBlur={() => {
            setOpen(false);
            if (draft.trim()) add(draft);
          }}
          placeholder={display.length ? 'Add tag…' : 'Add tags — type to search, Enter to add'}
          aria-label="Add tag"
          className="h-6 min-w-32 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching tags"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.tag}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                add(s.tag);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm ${i === active ? 'bg-indigo-50' : ''}`}
            >
              <span className="truncate text-gray-900">#{s.tag}</span>
              <span className="shrink-0 text-xs text-gray-400">
                {s.count} {s.count === 1 ? 'doc' : 'docs'}
              </span>
            </li>
          ))}
          {isNewTag && (
            <li
              id={`${listId}-${suggestions.length}`}
              role="option"
              aria-selected={active === suggestions.length}
              onMouseDown={(e) => {
                e.preventDefault();
                add(typed);
              }}
              onMouseEnter={() => setActive(suggestions.length)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${active === suggestions.length ? 'bg-indigo-50' : ''} ${suggestions.length ? 'border-t border-gray-100' : ''}`}
            >
              <Icon name="plus" className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate text-gray-900">
                Create <span className="font-medium">#{typed}</span>
              </span>
              <span className="ml-auto shrink-0 text-xs text-gray-400">new tag</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
