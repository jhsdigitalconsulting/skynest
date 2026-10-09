'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import { useVaultUrls } from './useVault';

/**
 * Vault-wide search. Typing on the browse page filters live (debounced, via the
 * URL); anywhere else, Enter jumps to the browse page with the query. Press "/"
 * from anywhere to focus it.
 */
export function HeaderSearch() {
  const urls = useVaultUrls();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onBrowse = pathname === urls.root;
  const urlQuery = onBrowse ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushed = useRef(urlQuery);

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
        router.push(urls.browse({ q: value.trim() || undefined }));
      }}
    >
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('');
            inputRef.current?.blur();
          }
        }}
        placeholder="Search documents…"
        aria-label="Search documents"
        className="h-9 w-full rounded-lg border-0 bg-gray-100 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] text-gray-500">
        /
      </kbd>
    </form>
  );
}
