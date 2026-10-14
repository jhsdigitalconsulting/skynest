'use client';

import { useSyncExternalStore } from 'react';
import { formatShortcut, isApplePlatform } from '@/lib/vault-ui/shortcuts';

const subscribe = () => () => {};
const isApple = () => isApplePlatform(navigator.platform || navigator.userAgent);

const asApple = (shortcut: string) => shortcut;
const asOther = (shortcut: string) => formatShortcut(shortcut, false);

/**
 * Formats a ⌘-style shortcut for the viewer's keyboard: unchanged on Apple
 * devices, Ctrl+… elsewhere. The server renders the Apple form; the client
 * corrects it after hydration without a mismatch.
 */
export function useShortcutLabel(): (shortcut: string) => string {
  return useSyncExternalStore(subscribe, isApple, () => true) ? asApple : asOther;
}
