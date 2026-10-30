'use client';

import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

interface Props {
  /** Current width of the pane being resized, in px. */
  width: number;
  min: number;
  max: number;
  /** Width restored by a double-click. */
  reset: number;
  /** `right` when the pane sits on the handle's left (dragging right widens it); `left` when it sits on the right. */
  grows: 'right' | 'left';
  onChange: (width: number) => void;
  label: string;
  className?: string;
}

const KEY_STEP = 16;

/** A vertical divider: drag it, or focus it and use the arrow keys. */
export function ResizeHandle({ width, min, max, reset, grows, onChange, label, className = '' }: Props) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const sign = grows === 'right' ? 1 : -1;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, width };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) onChange(drag.current.width + (e.clientX - drag.current.x) * sign);
  };
  const stop = () => {
    drag.current = null;
    document.body.style.userSelect = '';
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    onChange(width + (e.key === 'ArrowRight' ? KEY_STEP : -KEY_STEP) * sign);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(reset)}
      title="Drag to resize · double-click to reset"
      className={`group relative z-10 w-1 shrink-0 cursor-col-resize touch-none bg-gray-200 outline-none transition-colors hover:bg-indigo-400 focus-visible:bg-indigo-500 active:bg-indigo-500 ${className}`}
    >
      {/* A wider invisible hit area so the 4px line is easy to grab. */}
      <span className="absolute inset-y-0 -left-1.5 -right-1.5" aria-hidden />
    </div>
  );
}
