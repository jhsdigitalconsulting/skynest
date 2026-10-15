import { describe, expect, it } from 'vitest';
import { clampSize } from './TableDialog';

describe('clampSize', () => {
  it('keeps numbers in range', () => {
    expect(clampSize(4, 12)).toBe(4);
  });
  it('clamps to 1 and the maximum', () => {
    expect(clampSize(0, 12)).toBe(1);
    expect(clampSize(-2, 12)).toBe(1);
    expect(clampSize(99, 12)).toBe(12);
  });
});
