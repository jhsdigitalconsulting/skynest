'use client';

import { useEffect, useRef, useState } from 'react';

const DELAY_MS = 800;

export interface LocalBackup<T> {
  value: T;
  savedAt: number;
}

function read<T>(key: string): LocalBackup<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.savedAt === 'number' && 'value' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, backup: LocalBackup<T>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(backup));
  } catch {
    // Storage full or unavailable (private mode); the backup is best-effort.
  }
}

export function removeBackup(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Keeps unsaved edits in this browser so a crash, a closed tab or an expired
 * session doesn't lose them. Written shortly after each change while dirty and
 * cleared once the editor is clean again. On mount, a backup that differs from
 * what the page loaded with is offered back via `offer`.
 *
 * `accept` checks a stored value is usable and differs from the loaded one.
 */
export function useLocalBackup<T>(key: string, value: T, dirty: boolean, accept: (stored: unknown) => stored is T) {
  const [offer, setOffer] = useState<LocalBackup<T> | null>(null);
  const [checked, setChecked] = useState(false);
  const firstKey = useRef(key);
  const firstAccept = useRef(accept);
  const prevKey = useRef(key);

  useEffect(() => {
    const backup = read<unknown>(firstKey.current);
    if (backup && firstAccept.current(backup.value)) setOffer({ value: backup.value, savedAt: backup.savedAt });
    else if (backup) removeBackup(firstKey.current);
    setChecked(true);
  }, []);

  // A new document gets its own key once it's first saved; drop the old one.
  useEffect(() => {
    if (prevKey.current === key) return;
    removeBackup(prevKey.current);
    prevKey.current = key;
  }, [key]);

  useEffect(() => {
    // Leave an offered backup alone until it's restored or dismissed.
    if (!checked || offer) return;
    if (!dirty) {
      removeBackup(key);
      return;
    }
    const timer = setTimeout(() => write(key, { value, savedAt: Date.now() }), DELAY_MS);
    return () => clearTimeout(timer);
  }, [checked, offer, dirty, key, value]);

  return { offer, dismissOffer: () => setOffer(null) };
}
