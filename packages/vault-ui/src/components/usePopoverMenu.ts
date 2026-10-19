'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const ITEM_SELECTOR = '[data-menu-item]';

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
}

/**
 * Open/close state and keyboard behavior for a small dropdown menu: focus moves to
 * the first item on open, arrow keys / Home / End move between items, Escape and
 * Tab close it, and focus returns to the trigger when it closes from the keyboard.
 */
export function usePopoverMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Selected item first if there is one, otherwise the first item.
    const list = menuItems(menuRef.current);
    (list.find((el) => el.getAttribute('aria-current') === 'true') ?? list[0])?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    const list = menuItems(menuRef.current);
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      e.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(list.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') setOpen(false);
  };

  const onTriggerKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close(true);
    }
  };

  return {
    open,
    toggle: () => setOpen((o) => !o),
    close: () => close(false),
    rootRef,
    triggerRef,
    menuRef,
    onMenuKeyDown,
    onTriggerKeyDown,
  };
}
