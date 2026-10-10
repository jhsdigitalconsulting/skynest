import { describe, expect, it } from 'vitest';
import { normalizeHref } from './UrlLinkDialog';

describe('normalizeHref', () => {
  it('adds https:// to bare domains', () => {
    expect(normalizeHref(' example.com/page ')).toBe('https://example.com/page');
  });
  it('leaves URLs with a scheme, paths and anchors alone', () => {
    for (const href of ['http://a.com', 'mailto:a@b.com', 'contextnest://nodes/x', '/docs', '#top', '']) {
      expect(normalizeHref(href)).toBe(href);
    }
  });
});
