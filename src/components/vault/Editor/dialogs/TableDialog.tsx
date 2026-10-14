'use client';

import { FIELD_INPUT } from '../../field-styles';
import { useState } from 'react';
import { Dialog } from '../../Dialog';
import { buttonClass } from '../../button-styles';
import { useDialogFocus } from './useDialogFocus';

export const MAX_TABLE_COLS = 12;
export const MAX_TABLE_ROWS = 50;

export interface TableDialogProps {
  onClose: () => void;
  onSubmit: (rows: number, cols: number) => void;
}

const INPUT_CLASS = `mt-1 ${FIELD_INPUT}`;

/** A whole number from `raw`, held between 1 and `max`; `fallback` when it isn't a number. */
export function clampCount(raw: string, max: number, fallback: number): number {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || raw.trim() === '') return fallback;
  return Math.min(Math.max(n, 1), max);
}

/** Pick the size of a new table. Rows include the header row. */
export function TableDialog({ onClose, onSubmit }: TableDialogProps) {
  const [cols, setCols] = useState('3');
  const [rows, setRows] = useState('3');
  const colsRef = useDialogFocus<HTMLInputElement>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(clampCount(rows, MAX_TABLE_ROWS, 3), clampCount(cols, MAX_TABLE_COLS, 3));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Insert table"
      description="The first row is the header."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="submit" form="table-form" className={buttonClass('primary')}>
            Insert table
          </button>
        </>
      }
    >
      <form id="table-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-gray-700">
          Columns
          <input
            ref={colsRef}
            type="number"
            min={1}
            max={MAX_TABLE_COLS}
            value={cols}
            onChange={(e) => setCols(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Rows
          <input
            type="number"
            min={1}
            max={MAX_TABLE_ROWS}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      </form>
    </Dialog>
  );
}
