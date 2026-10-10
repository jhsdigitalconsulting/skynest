'use client';

import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Modal built on the native <dialog> element: focus trapping, Esc and backdrop handling come for free. */
export function Dialog({ open, onClose, title, description, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="vault-dialog m-auto w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl ring-1 ring-gray-200"
    >
      {open && (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {description && <div className="mt-1 text-sm text-gray-500">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-3">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
