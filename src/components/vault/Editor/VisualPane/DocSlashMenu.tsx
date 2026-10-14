'use client';

import { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { Ref } from 'react';
import type { LinkTarget } from '@/lib/vault-ui/wikilinks';
import { Icon } from '../../Icon';
import { searchDocs, titleOf } from '../dialogs/DocLinkDialog/search';
import type { DocSlashState } from './doc-slash';

const LIMIT = 8;
const WIDTH = 352;

export interface DocSlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  state: DocSlashState;
  docs: LinkTarget[];
  onPick: (doc: LinkTarget) => void;
  ref: Ref<DocSlashMenuHandle>;
}

/** The floating result list for a `/` document search, anchored under the caret. */
export function DocSlashMenu({ state, docs, onPick, ref }: Props) {
  const results = useMemo(() => searchDocs(docs, state.query).slice(0, LIMIT), [docs, state.query]);
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [state.query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!results.length) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((i) => (i + step + results.length) % results.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        onPick(results[Math.min(active, results.length - 1)]);
        return true;
      }
      return false;
    },
  }));

  if (!state.rect) return null;
  // Below the caret, kept inside the viewport; flips above when there's no room underneath.
  const left = Math.max(8, Math.min(state.rect.left, window.innerWidth - WIDTH - 8));
  const below = window.innerHeight - state.rect.bottom > 320;
  const position = below ? { top: state.rect.bottom + 6 } : { bottom: window.innerHeight - state.rect.top + 6 };

  return (
    <div
      style={{ left, width: WIDTH, ...position }}
      className="fixed z-40 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-200"
      // Keep focus (and the selection) in the editor while clicking a result.
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-500">
        {state.query ? (
          <>
            Link to a document matching <span className="font-medium text-gray-700">“{state.query}”</span>
          </>
        ) : (
          'Link to a document — keep typing to search'
        )}
      </p>
      <ul role="listbox" aria-label="Documents" className="max-h-72 overflow-y-auto p-1">
        {results.map((doc, i) => (
          <li
            key={doc.id}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => onPick(doc)}
            className={`flex cursor-pointer gap-2.5 rounded-md px-2 py-1.5 ${i === active ? 'bg-indigo-50' : ''}`}
          >
            <Icon name="file" className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">{titleOf(doc)}</span>
              <span className="block truncate font-mono text-[11px] text-gray-500">{doc.id}</span>
            </span>
          </li>
        ))}
        {!results.length && (
          <li className="px-2 py-3 text-center text-sm text-gray-500">No documents match. Press Esc to keep the “/”.</li>
        )}
      </ul>
      <p className="border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-500">↑↓ to choose · Enter to link · Esc to dismiss</p>
    </div>
  );
}
