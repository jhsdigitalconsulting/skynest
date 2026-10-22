'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface ReviewLayout {
  listOpen: boolean;
  listWidth: number;
  sideOpen: boolean;
  sideWidth: number;
}

export const LIST_WIDTH = { min: 240, max: 640, initial: 352 };
export const SIDE_WIDTH = { min: 280, max: 560, initial: 320 };

const STORAGE_KEY = 'vault-ui:review-layout';

/** What the server renders, and what a first-time or storage-less visitor gets. */
const DEFAULTS: ReviewLayout = {
  listOpen: true,
  listWidth: LIST_WIDTH.initial,
  sideOpen: true,
  sideWidth: SIDE_WIDTH.initial,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function parse(raw: string | null): ReviewLayout {
  if (!raw) return DEFAULTS;
  try {
    const v = JSON.parse(raw) as Partial<ReviewLayout>;
    return {
      listOpen: typeof v.listOpen === 'boolean' ? v.listOpen : DEFAULTS.listOpen,
      listWidth: typeof v.listWidth === 'number' ? clamp(v.listWidth, LIST_WIDTH.min, LIST_WIDTH.max) : DEFAULTS.listWidth,
      sideOpen: typeof v.sideOpen === 'boolean' ? v.sideOpen : DEFAULTS.sideOpen,
      sideWidth: typeof v.sideWidth === 'number' ? clamp(v.sideWidth, SIDE_WIDTH.min, SIDE_WIDTH.max) : DEFAULTS.sideWidth,
    };
  } catch {
    return DEFAULTS;
  }
}

// One store shared by the list and the detail pane, which render in different components.
let current: ReviewLayout | null = null;
const listeners = new Set<() => void>();

function read(): ReviewLayout {
  if (current) return current;
  try {
    current = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    current = DEFAULTS;
  }
  return current;
}

function write(patch: Partial<ReviewLayout>) {
  current = { ...read(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode or a full quota: the layout still works, it just isn't remembered.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    current = parse(e.newValue);
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Pane widths and which panes are collapsed, remembered between visits.
 * The server snapshot is always the defaults, so hydration matches; saved values apply right after.
 */
export function useReviewLayout() {
  const layout = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  return {
    layout,
    setListOpen: useCallback((listOpen: boolean) => write({ listOpen }), []),
    setSideOpen: useCallback((sideOpen: boolean) => write({ sideOpen }), []),
    setListWidth: useCallback((w: number) => write({ listWidth: clamp(w, LIST_WIDTH.min, LIST_WIDTH.max) }), []),
    setSideWidth: useCallback((w: number) => write({ sideWidth: clamp(w, SIDE_WIDTH.min, SIDE_WIDTH.max) }), []),
  };
}
