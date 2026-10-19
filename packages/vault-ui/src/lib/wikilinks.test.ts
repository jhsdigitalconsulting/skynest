import { describe, expect, it } from 'vitest';
import { buildLinkIndex, parseWikiLink, resolveVaultHref, resolveWikiTarget } from './wikilinks';

const index = buildLinkIndex([
  { id: 'nodes/systems/builder', frontmatter: { title: 'System: Builder.io' } },
  { id: 'nodes/ontology/core/location', frontmatter: { title: 'Location' } },
  { id: 'nodes/dupe', frontmatter: { title: 'Location' } },
  { id: 'nodes/untitled', frontmatter: {} },
]);

describe('wikilinks', () => {
  it('resolves by id, then exact title, then case-insensitive title', () => {
    expect(resolveWikiTarget('nodes/untitled', index)).toBe('nodes/untitled');
    expect(resolveWikiTarget('System: Builder.io', index)).toBe('nodes/systems/builder');
    expect(resolveWikiTarget('system: builder.io', index)).toBe('nodes/systems/builder');
    expect(resolveWikiTarget('Location', index)).toBe('nodes/ontology/core/location');
    expect(resolveWikiTarget('Missing', index)).toBeNull();
  });

  it('splits target and label', () => {
    expect(parseWikiLink('nodes/x|Label')).toEqual({ target: 'nodes/x', label: 'Label' });
    expect(parseWikiLink(' Title ')).toEqual({ target: 'Title', label: 'Title' });
    expect(parseWikiLink('Title|')).toEqual({ target: 'Title', label: 'Title' });
  });

  it('resolves in-vault hrefs and ignores others', () => {
    expect(resolveVaultHref('wikilink:System%3A%20Builder.io', index)).toBe('nodes/systems/builder');
    expect(resolveVaultHref('contextnest://nodes/untitled#intro', index)).toBe('nodes/untitled');
    expect(resolveVaultHref('contextnest://nodes/gone', index)).toBeNull();
    expect(resolveVaultHref('https://example.com', index)).toBeUndefined();
  });
});
