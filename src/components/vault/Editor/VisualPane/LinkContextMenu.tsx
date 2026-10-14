'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Icon } from '../../Icon';
import type { IconName } from '../../Icon';

/** Where the menu opened, and the link it's for. */
export interface LinkMenuState {
  x: number;
  y: number;
  href: string;
}

interface Props {
  state: LinkMenuState;
  onEdit: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function Item({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
    >
      <Icon name={icon} className="h-4 w-4 text-gray-500" />
      {label}
    </button>
  );
}

/** The right-click menu on a link in the visual editor. */
export function LinkContextMenu({ state, onEdit, onOpen, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Keep the menu on screen when right-clicking near the bottom or right edge.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const { width, height } = el.getBoundingClientRect();
    el.style.left = `${Math.max(margin, Math.min(state.x, window.innerWidth - width - margin))}px`;
    el.style.top = `${Math.max(margin, Math.min(state.y, window.innerHeight - height - margin))}px`;
  }, [state.x, state.y]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as globalThis.KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'mousedown' && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const next = items.indexOf(document.activeElement as HTMLButtonElement) + (e.key === 'ArrowDown' ? 1 : -1);
    items[(next + items.length) % items.length]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Link actions"
      onKeyDown={onKeyDown}
      style={{ left: state.x, top: state.y }}
      className="fixed z-50 w-48 rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200"
    >
      <Item icon="edit" label="Edit link" onClick={onEdit} />
      <Item icon="link" label="Open link" onClick={onOpen} />
      <Item icon="trash" label="Remove link" onClick={onRemove} />
    </div>
  );
}
