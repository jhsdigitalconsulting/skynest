import { describe, expect, it } from 'vitest';
import { formatShortcut, isApplePlatform } from './shortcuts';

describe('formatShortcut', () => {
  it('keeps Apple symbols on Apple platforms', () => {
    expect(formatShortcut('⌘⇧K', true)).toBe('⌘⇧K');
  });

  it('spells out Ctrl and Shift elsewhere', () => {
    expect(formatShortcut('⌘B', false)).toBe('Ctrl+B');
    expect(formatShortcut('⌘⇧Z', false)).toBe('Ctrl+Shift+Z');
    expect(formatShortcut('⌘ Enter to send', false)).toBe('Ctrl+Enter to send');
    expect(formatShortcut('Use ⌘B / ⌘I', false)).toBe('Use Ctrl+B / Ctrl+I');
  });
});

describe('isApplePlatform', () => {
  it('recognises Macs and iOS devices', () => {
    expect(isApplePlatform('MacIntel')).toBe(true);
    expect(isApplePlatform('iPad')).toBe(true);
    expect(isApplePlatform('Win32')).toBe(false);
    expect(isApplePlatform('Linux x86_64')).toBe(false);
  });
});
