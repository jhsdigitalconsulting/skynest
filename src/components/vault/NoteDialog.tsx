'use client';

import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { buttonClass } from './button-styles';
import type { ButtonVariant } from './button-styles';

interface Props {
  open: boolean;
  pending: boolean;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  cta: string;
  variant: ButtonVariant;
  /** When true the note can't be empty. */
  required?: boolean;
  /** Extra content under the note, e.g. a stale-draft warning. */
  extra?: React.ReactNode;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

/** A confirm dialog with a free-text note — used for submit, approve and request changes. */
export function NoteDialog(props: Props) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (props.open) setNote('');
  }, [props.open]);

  const blocked = props.pending || props.confirmDisabled || (props.required && !note.trim());
  const confirm = () => {
    if (!blocked) props.onConfirm(note.trim());
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
      footer={
        <>
          <button type="button" onClick={props.onClose} className={buttonClass('ghost')}>
            Cancel
          </button>
          <button type="button" disabled={blocked} onClick={confirm} className={buttonClass(props.variant)}>
            {props.pending ? 'Working…' : props.cta}
          </button>
        </>
      }
    >
      <label htmlFor="note-dialog-text" className="block text-sm font-medium text-gray-700">
        {props.label}
      </label>
      <textarea
        id="note-dialog-text"
        autoFocus
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirm();
        }}
        placeholder={props.placeholder}
        className="mt-1.5 block w-full rounded-lg border-0 text-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <p className="mt-1.5 text-xs text-gray-400">⌘ Enter to confirm</p>
      {props.extra}
    </Dialog>
  );
}
