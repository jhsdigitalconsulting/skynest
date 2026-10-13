import { describe, expect, it } from 'vitest';
import { clampCount } from './TableDialog';

describe('clampCount', () => {
  it('keeps whole numbers in range', () => {
    expect(clampCount('4', 12, 3)).toBe(4);
    expect(clampCount('5.9', 12, 3)).toBe(5);
  });
  it('clamps to 1 and the maximum', () => {
    expect(clampCount('0', 12, 3)).toBe(1);
    expect(clampCount('-2', 12, 3)).toBe(1);
    expect(clampCount('99', 12, 3)).toBe(12);
  });
  it('falls back when empty or not a number', () => {
    expect(clampCount('', 12, 3)).toBe(3);
    expect(clampCount('abc', 12, 3)).toBe(3);
  });
});
