'use client';

import { FIELD_INPUT } from '../../field-styles';
import { useState } from 'react';
import { Dialog } from '../../Dialog';
import { buttonClass } from '../../button-styles';
import { useDialogFocus } from './useDialogFocus';

/** Mount only while open, so each opening starts from `initialHref`. */
export interface UrlLinkDialogProps {
  /** The current link's URL when editing one. */
  initialHref: string;
  /** The link's current text, or the selected text; empty when there is neither. */
  initialText: string;
  onClose: () => void;
  onSubmit: (href: string, text: string) => void;
  onRemove: () => void;
}

const INPUT_CLASS = `mt-1 ${FIELD_INPUT}`;

/** `example.com` → `https://example.com`; leaves anything with a scheme, a path or an anchor alone. */
export function normalizeHref(raw: string): string {
  const href = raw.trim();
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || /^[/#?.]/.test(href)) return href;
  return `https://${href}`;
}

/** Add or edit a link to a web page. Links to documents in the vault use DocLinkDialog. */
export function UrlLinkDialog({ initialHref, initialText, onClose, onSubmit, onRemove }: UrlLinkDialogProps) {
  const [href, setHref] = useState(initialHref);
  const [text, setText] = useState(initialText);
  const inputRef = useDialogFocus<HTMLInputElement>();
  const editing = Boolean(initialHref);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = normalizeHref(href);
    if (url) onSubmit(url, text.trim());
    else if (editing) onRemove();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Edit link' : 'Link to a web page'}
      description="For pages outside this vault. To link to a document in the vault, use Link to a document."
      footer={
        <>
          {editing && (
            <button type="button" onClick={onRemove} className={buttonClass('danger', 'md', 'mr-auto')}>
              Remove link
            </button>
          )}
          <button type="button" onClick={onClose} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="submit" form="url-link-form" disabled={!href.trim()} className={buttonClass('primary')}>
            {editing ? 'Update' : 'Add link'}
          </button>
        </>
      }
    >
      <form id="url-link-form" onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          URL
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://example.com"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Link text <span className="font-normal text-gray-400">(optional)</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Defaults to the URL"
            className={INPUT_CLASS}
          />
        </label>
      </form>
    </Dialog>
  );
}
