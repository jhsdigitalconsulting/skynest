'use client';

import { useMemo, useState } from 'react';
import type { LinkTarget } from '@/lib/vault-ui/wikilinks';
import { Dialog } from '../../../Dialog';
import { FIELD_INPUT } from '../../../field-styles';
import { Icon } from '../../../Icon';
import { useDialogFocus } from '../useDialogFocus';
import { searchDocs, titleOf } from './search';

export { titleOf } from './search';

/** Mount only while open, so each opening starts with an empty search. */
export interface DocLinkDialogProps {
  docs: LinkTarget[];
  /** The link's current text, or the selected text; empty when there is neither. */
  initialText: string;
  /** Changing an existing link rather than adding one. */
  editing: boolean;
  onClose: () => void;
  /** `text` is what the author typed for the link, '' meaning "use the document's title". */
  onPick: (doc: LinkTarget, text: string) => void;
}

const LIMIT = 100;

/** Pick a document in this vault to link to. */
export function DocLinkDialog({ docs, initialText, editing, onClose, onPick }: DocLinkDialogProps) {
  const [query, setQuery] = useState('');
  const [text, setText] = useState(initialText);
  const [active, setActive] = useState(0);
  const inputRef = useDialogFocus<HTMLInputElement>();
  const results = useMemo(() => searchDocs(docs, query), [docs, query]);
  const shown = results.slice(0, LIMIT);

  const pick = (doc: LinkTarget | undefined) => {
    if (doc) onPick(doc, text.trim());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(Math.max(active + (e.key === 'ArrowDown' ? 1 : -1), 0), shown.length - 1);
      setActive(next);
      document.getElementById(`doc-link-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(shown[active]);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Edit document link' : 'Link to a document'}
      description="Pick a document in this vault. The link points at the document, so it keeps working if the title changes. Set the link text to say it your way, such as a plural."
    >
      <label className="mb-3 block text-sm font-medium text-gray-700">
        Link text <span className="font-normal text-gray-400">(optional)</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              pick(shown[active]);
            }
          }}
          placeholder="Defaults to the document's title"
          className={`mt-1 ${FIELD_INPUT}`}
        />
      </label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search by title, path or tag…"
          aria-label="Search documents"
          aria-controls="doc-link-results"
          aria-activedescendant={shown.length ? `doc-link-${active}` : undefined}
          className="h-10 w-full rounded-lg border-0 pl-9 pr-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <ul id="doc-link-results" role="listbox" aria-label="Documents" className="-mx-2 mt-3 max-h-[55vh] overflow-y-auto">
        {shown.map((doc, i) => (
          <li
            key={doc.id}
            id={`doc-link-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(doc)}
            className={`flex cursor-pointer gap-3 rounded-lg px-2 py-2 ${i === active ? 'bg-indigo-50' : ''}`}
          >
            <Icon name="file" className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">{titleOf(doc)}</span>
              <span className="block truncate text-xs text-gray-500">
                {[doc.id, ...doc.tags.map((t) => `#${t.replace(/^#+/, '')}`)].join(' · ')}
              </span>
            </span>
          </li>
        ))}
        {!shown.length && <li className="px-2 py-6 text-center text-sm text-gray-500">No documents match “{query}”.</li>}
        {results.length > LIMIT && (
          <li className="px-2 py-2 text-center text-xs text-gray-400">
            Showing {LIMIT} of {results.length} — keep typing to narrow it down.
          </li>
        )}
      </ul>
    </Dialog>
  );
}
