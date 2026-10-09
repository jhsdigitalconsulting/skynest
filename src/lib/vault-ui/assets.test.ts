import { describe, expect, it } from 'vitest';
import { assetFileFromUrl, isVideoName, uploadProblem } from './assets';

const FILE = '2f0c6a8e-1b2d-4c3e-9f4a-5b6c7d8e9f01';

describe('vault assets', () => {
  it('reads the file from a Community asset reference, whatever the nest id', () => {
    expect(assetFileFromUrl(`/nests/7d3e1c2a-4b5f-4e6a-8c9d-0e1f2a3b4c5d/assets/${FILE}.png`)).toBe(`${FILE}.png`);
    expect(assetFileFromUrl(`/nests/oh/assets/${FILE}.webm`)).toBe(`${FILE}.webm`);
  });

  it('ignores other URLs and names', () => {
    expect(assetFileFromUrl('https://example.com/a.png')).toBeNull();
    expect(assetFileFromUrl(`/nests/oh/assets/../${FILE}.png`)).toBeNull();
    expect(assetFileFromUrl(`/nests/oh/assets/${FILE}.svg`)).toBeNull();
    expect(assetFileFromUrl(`/nests/oh/assets/photo.png`)).toBeNull();
  });

  it('tells videos from images', () => {
    expect(isVideoName('a.MP4')).toBe(true);
    expect(isVideoName('a.webm')).toBe(true);
    expect(isVideoName('a.gif')).toBe(false);
  });

  it('enforces the types and size limits Community does', () => {
    expect(uploadProblem('a.png', 10 * 1024 * 1024)).toBeNull();
    expect(uploadProblem('a.png', 10 * 1024 * 1024 + 1)).toMatch(/limit is 10 MB/);
    expect(uploadProblem('a.mp4', 30 * 1024 * 1024)).toBeNull();
    expect(uploadProblem('a.mp4', 30 * 1024 * 1024 + 1)).toMatch(/limit is 30 MB/);
    expect(uploadProblem('a.svg', 10)).toMatch(/aren't supported/);
  });
});
