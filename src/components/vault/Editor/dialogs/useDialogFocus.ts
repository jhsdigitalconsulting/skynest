'use client';

import { useEffect, useRef } from 'react';

/**
 * Focus an element in a dialog that has just mounted open. `showModal()` runs in
 * the dialog's own effect (after its children's) and moves focus to the first
 * focusable element, so focus on the next frame instead.
 */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  return ref;
}
