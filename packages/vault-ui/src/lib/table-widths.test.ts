import { describe, expect, it } from 'vitest';
import { columnPixelWidths, dashesForPixels, separatorDashes } from './table-widths';

describe('separatorDashes', () => {
  it('reads relative widths from the dash counts', () => {
    expect(separatorDashes('| --- | ------ |')).toEqual([3, 6]);
    expect(separatorDashes('|:---|---:|:-----:|')).toEqual([3, 3, 5]);
  });
  it('is null when every column is the same length or the line is not a separator', () => {
    expect(separatorDashes('| --- | --- |')).toBeNull();
    expect(separatorDashes('| a | b |')).toBeNull();
    expect(separatorDashes('')).toBeNull();
  });
});

describe('columnPixelWidths', () => {
  it('scales dashes to pixels, never below the minimum', () => {
    expect(columnPixelWidths('| a | b |\n| --- | ------------------ |\n| 1 | 2 |', 120)).toEqual([120, 180]);
  });
  it('is null for an ordinary table', () => {
    expect(columnPixelWidths('| a | b |\n| --- | --- |', 120)).toBeNull();
  });
});

describe('dashesForPixels', () => {
  it('rounds and keeps at least three dashes', () => {
    expect(dashesForPixels(200)).toBe(20);
    expect(dashesForPixels(5)).toBe(3);
  });
});
