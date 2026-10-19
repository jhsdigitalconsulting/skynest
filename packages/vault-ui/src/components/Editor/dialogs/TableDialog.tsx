'use client';

import { useState } from 'react';
import { Dialog } from '../../Dialog';
import { buttonClass } from '../../button-styles';
import { useDialogFocus } from './useDialogFocus';

export const MAX_TABLE_COLS = 12;
export const MAX_TABLE_ROWS = 50;

const MIN_VISIBLE_COLS = 8;
const MIN_VISIBLE_ROWS = 5;

export interface TableDialogProps {
  onClose: () => void;
  onSubmit: (rows: number, cols: number) => void;
}

interface Size {
  rows: number;
  cols: number;
}

/** `n` held between 1 and `max`. */
export function clampSize(n: number, max: number): number {
  return Math.min(Math.max(n, 1), max);
}

/** Pick the size of a new table by pointing at a grid. Rows include the header row. */
export function TableDialog({ onClose, onSubmit }: TableDialogProps) {
  const [size, setSize] = useState<Size>({ rows: 3, cols: 3 });
  const gridRef = useDialogFocus<HTMLDivElement>();

  // The grid grows one step past the highlighted cell, so a bigger table is always in reach.
  const visibleCols = clampSize(Math.max(MIN_VISIBLE_COLS, size.cols + 1), MAX_TABLE_COLS);
  const visibleRows = clampSize(Math.max(MIN_VISIBLE_ROWS, size.rows + 1), MAX_TABLE_ROWS);

  const move = (dRows: number, dCols: number) =>
    setSize((s) => ({
      rows: clampSize(s.rows + dRows, MAX_TABLE_ROWS),
      cols: clampSize(s.cols + dCols, MAX_TABLE_COLS),
    }));

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (step[e.key]) {
      e.preventDefault();
      move(...step[e.key]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(size.rows, size.cols);
    }
  };

  const cells = [];
  for (let r = 1; r <= visibleRows; r++) {
    for (let c = 1; c <= visibleCols; c++) {
      const active = r <= size.rows && c <= size.cols;
      cells.push(
        <div
          key={`${r}-${c}`}
          role="gridcell"
          aria-selected={active}
          onMouseEnter={() => setSize({ rows: r, cols: c })}
          onClick={() => onSubmit(r, c)}
          className={`h-5 w-5 cursor-pointer rounded-sm border ${
            active ? 'border-indigo-500 bg-indigo-100' : 'border-gray-200 bg-gray-50'
          }`}
        />,
      );
    }
  }

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
          <button type="button" onClick={() => onSubmit(size.rows, size.cols)} className={buttonClass('primary')}>
            Insert table
          </button>
        </>
      }
    >
      <div className="max-h-72 overflow-auto">
        <div
          ref={gridRef}
          role="grid"
          tabIndex={0}
          aria-label="Table size. Use the arrow keys to resize and Enter to insert."
          onKeyDown={onKeyDown}
          className="mx-auto grid w-fit gap-1 rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{ gridTemplateColumns: `repeat(${visibleCols}, 1.25rem)` }}
        >
          {cells}
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-medium text-gray-700" aria-live="polite">
        {size.cols} × {size.rows}
      </p>
    </Dialog>
  );
}
