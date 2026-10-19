import { describe, expect, it } from 'vitest';
import { joinContextMd, splitContextMd } from './context-md';

describe('splitContextMd', () => {
  it('separates frontmatter from the body and round-trips', () => {
    const raw = '---\ntitle: Vault\nversion: 2\n---\n\n# Hello\n';
    const parts = splitContextMd(raw);
    expect(parts.head).toBe('---\ntitle: Vault\nversion: 2\n---\n');
    expect(parts.body).toBe('\n# Hello\n');
    expect(joinContextMd(parts)).toBe(raw);
  });

  it('treats a file without frontmatter as all body', () => {
    expect(splitContextMd('# Hello\n')).toEqual({ head: '', body: '# Hello\n' });
  });

  it('does not mistake a horizontal rule later in the file for frontmatter', () => {
    const raw = '# Hello\n\n---\n\nmore\n---\n';
    expect(splitContextMd(raw).head).toBe('');
  });
});
