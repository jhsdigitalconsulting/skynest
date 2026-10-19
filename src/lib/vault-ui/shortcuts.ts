/**
 * Shortcuts are written the Apple way (⌘B, ⌘⇧K, "⌘ Enter"). Elsewhere they read
 * Ctrl+B, Ctrl+Shift+K, "Ctrl+Enter".
 */
export function formatShortcut(shortcut: string, apple: boolean): string {
  if (apple) return shortcut;
  return shortcut.replace(/⌘\s?/g, 'Ctrl+').replace(/⇧\s?/g, 'Shift+').replace(/⌥\s?/g, 'Alt+');
}

export function isApplePlatform(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}
