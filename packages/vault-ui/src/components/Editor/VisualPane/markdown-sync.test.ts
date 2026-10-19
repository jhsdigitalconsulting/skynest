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
  it('writes the given dashes to carry column widths', () => {
    expect(compactTable('| a | b |\n| :--- | --- |', [10, 25])).toBe('| a | b |\n| :---------- | ------------------------- |');
  });
});

describe('column widths', () => {
  const TABLE = '| a | b |\n| --- | ------------------ |\n| 1 | 2 |\n';

  it('loads widths from the separator row and writes an untouched table back as it was', () => {
    const { editor, map } = open(TABLE);
    const widths: (number[] | null)[] = [];
    editor.state.doc.firstChild?.firstChild?.forEach((cell) => widths.push(cell.attrs.colwidth));
    expect(widths).toEqual([[120], [180]]);
    expect(toMarkdown(editor, map)).toBe(TABLE);
  });

  it('writes a dragged width into the separator row', () => {
    const { editor, map } = open('| a | b |\n| --- | --- |\n| 1 | 2 |\n');
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableHeader' && node.textContent === 'b') {
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, colwidth: [300] }));
      }
    });
    expect(toMarkdown(editor, map)).toBe('| a | b |\n| ------------ | ------------------------------ |\n| 1 | 2 |\n');
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
