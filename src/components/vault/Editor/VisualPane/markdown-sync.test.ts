// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { applyGentleEscaping, escapeText, visualExtensions } from './extensions';
import { compactTable, loadMarkdown, toMarkdown } from './markdown-sync';

let editor: Editor | null = null;

function open(markdown: string) {
  editor = new Editor({ extensions: visualExtensions('') });
  applyGentleEscaping(editor);
  const map = loadMarkdown(editor, markdown);
  return { editor, map };
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

const DOC = `# Builder.io

Owned by [[System: Builder.io]] and [[nodes/ontology/core/location|Location]].

| Field   | Value     |
|---------|-----------|
| owner   | team_a    |

- [ ] first
- [x] done

Contact a@b.com or https://example.com &amp; more.
`;

describe('markdown-sync', () => {
  it('round-trips an untouched document byte-for-byte', () => {
    const { editor: e, map } = open(DOC);
    expect(toMarkdown(e, map)).toBe(DOC);
  });

  it('only re-serializes the block that changed', () => {
    const { editor: e, map } = open(DOC);
    // Append to the end of the first paragraph (after the heading).
    let end = 0;
    e.state.doc.forEach((node, offset, index) => {
      if (index === 1) end = offset + node.nodeSize - 1;
    });
    e.commands.insertContentAt(end, ' Edited.');
    const out = toMarkdown(e, map);
    expect(out).toContain('[[nodes/ontology/core/location|Location]]. Edited.');
    // The untouched table keeps its original padding.
    expect(out).toContain('| Field   | Value     |');
    expect(out).toContain('&amp; more.');
  });

  it('serializes new content without escaping wikilinks', () => {
    const { editor: e, map } = open('');
    e.commands.setContent('<p>See [[Some Title]] and snake_case.</p>');
    expect(toMarkdown(e, map)).toBe('See [[Some Title]] and snake_case.');
  });
});

describe('compactTable', () => {
  it('trims cell padding and normalizes separators', () => {
    expect(compactTable('|  a   | b |\n| :----- | ---: |')).toBe('| a | b |\n| :--- | ---: |');
  });
});

describe('escapeText', () => {
  it('leaves wikilinks, lone tildes and intra-word underscores alone', () => {
    expect(escapeText('[[A|b]] ~70 snake_case')).toBe('[[A|b]] ~70 snake_case');
  });

  it('escapes markdown syntax that would change meaning', () => {
    expect(escapeText('*x* `y` [z] _w_ ~~s~~ <div> &copy;')).toBe(
      '\\*x\\* \\`y\\` \\[z\\] \\_w\\_ \\~\\~s\\~\\~ &lt;div> &amp;copy;',
    );
  });
});
