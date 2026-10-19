'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { suggestDocs } from '@/lib/vault-ui/suggest';
import type { LinkTarget } from '@/lib/vault-ui/wikilinks';
import { Icon } from './Icon';
import { useVaultUrls } from './useVault';

interface Props {
  /** Every document, for the typeahead dropdown. */
  docs: LinkTarget[];
}

/**
 * Vault-wide search. Typing on the browse page filters live (debounced, via the
 * URL); anywhere else, Enter jumps to the browse page with the query. While typing, matching documents are suggested
 * and ↑/↓ + Enter opens one. Press "/" from anywhere to focus it.
 */
export function HeaderSearch({ docs }: Props) {
  const urls = useVaultUrls();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onBrowse = pathname === urls.root;
  const urlQuery = onBrowse ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushed = useRef(urlQuery);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useMemo(() => suggestDocs(docs, value), [docs, value]);
  const showList = open && suggestions.length > 0;
  const openDoc = (id: string) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(urls.doc(id));
  };

  // Follow the URL (back/forward, links) but never clobber what's being typed.
  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setValue(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!onBrowse || value.trim() === urlQuery) return;
    const t = setTimeout(() => {
      lastPushed.current = value.trim();
      router.replace(
        urls.browse({
          q: value.trim() || undefined,
          folder: params.get('folder') ?? undefined,
          type: params.get('type') ?? undefined,
        }),
        { scroll: false },
      );
    }, 250);
    return () => clearTimeout(t);
  }, [value, onBrowse, urlQuery, params, router, urls]);

  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (showList && active >= 0) return openDoc(suggestions[active].id);
        setOpen(false);
        router.push(urls.browse({ q: value.trim() || undefined }));
      }}
    >
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (showList) {
              setOpen(false);
              return;
            }
            setValue('');
            inputRef.current?.blur();
          } else if (showList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const n = suggestions.length;
            setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n));
          }
        }}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search documents…"
        aria-label="Search documents"
        className="h-9 w-full rounded-lg border-0 bg-gray-100 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] text-gray-500">
        /
      </kbd>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching documents"
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200"
        >
          {suggestions.map((doc, i) => (
            <li
              key={doc.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                openDoc(doc.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 ${i === active ? 'bg-indigo-50' : ''}`}
            >
              <p className="truncate text-sm font-medium text-gray-900">{doc.title || doc.id}</p>
              <p className="truncate font-mono text-xs text-gray-500">{doc.id}</p>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
