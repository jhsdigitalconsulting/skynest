// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { applyGentleEscaping, visualExtensions } from './extensions';
import { applyLink, currentHref, removeLink } from './linking';
import { loadMarkdown, toMarkdown } from './markdown-sync';

let editor: Editor | null = null;

function open(markdown: string) {
  editor = new Editor({ extensions: visualExtensions('') });
  applyGentleEscaping(editor);
  const map = loadMarkdown(editor, markdown);
  return { editor, out: () => toMarkdown(editor!, map) };
}

/** Select the first occurrence of `text` (or put the cursor before it when `collapse`). */
function select(e: Editor, text: string, collapse = false) {
  let from = -1;
  e.state.doc.descendants((node, pos) => {
    if (from === -1 && node.isText && node.text!.includes(text)) from = pos + node.text!.indexOf(text);
  });
  const to = collapse ? from + 1 : from + text.length;
  e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, collapse ? from + 1 : from, to)));
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('visual editor links and images', () => {
  it('round-trips strikethrough, images and contextnest links untouched', () => {
    const md = 'A ~~gone~~ word, ![diagram](https://example.com/d.png) and [Location](contextnest://nodes/core/location).\n';
    const { out } = open(md);
    expect(out()).toBe(md);
  });

  it('links the selection to a document', () => {
    const { editor: e, out } = open('See the location doc.');
    select(e, 'location');
    applyLink(e, 'contextnest://nodes/core/location', 'Location');
    expect(out()).toBe('See the [location](contextnest://nodes/core/location) doc.');
  });

  it('inserts the title as a link when nothing is selected', () => {
    const { editor: e, out } = open('See ');
    e.commands.focus('end');
    applyLink(e, 'contextnest://nodes/core/location', 'Location');
    expect(out()).toBe('See [Location](contextnest://nodes/core/location)');
  });

  it('retargets and removes the link under the cursor', () => {
    const { editor: e, out } = open('Go to [the site](https://old.example.com) now.');
    select(e, 'site', true);
    expect(currentHref(e)).toBe('https://old.example.com');
    applyLink(e, 'https://new.example.com', 'ignored');
    expect(out()).toBe('Go to [the site](https://new.example.com) now.');
    select(e, 'site', true);
    removeLink(e);
    expect(out()).toBe('Go to the site now.');
  });

  it('inserts an image', () => {
    const { editor: e, out } = open('Before');
    e.chain().focus('end').setImage({ src: 'https://example.com/a.png', alt: 'A chart' }).run();
    expect(out()).toBe('Before![A chart](https://example.com/a.png)');
  });
});

describe('visual editor assets', () => {
  const FILE = '2f0c6a8e-1b2d-4c3e-9f4a-5b6c7d8e9f01';
  const mapped = (src: string) => src.replace(/^\/nests\/[^/]+\/assets\//, '/vault/oh/assets/');

  it('displays vault images from this server but keeps the reference', () => {
    editor = new Editor({ extensions: visualExtensions('', mapped) });
    applyGentleEscaping(editor);
    const md = `![chart](/nests/abc/assets/${FILE}.png)\n`;
    const map = loadMarkdown(editor, md);
    expect(editor.view.dom.querySelector("img[data-src]")?.getAttribute('src')).toBe(`/vault/oh/assets/${FILE}.png`);
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph', content: [{ type: 'text', text: 'More' }] });
    expect(toMarkdown(editor, map)).toBe(`${md}\nMore\n`);
  });

  it('shows a player under a video URL paragraph and round-trips it', () => {
    editor = new Editor({ extensions: visualExtensions('', mapped) });
    applyGentleEscaping(editor);
    const md = `Intro\n\n/nests/abc/assets/${FILE}.mp4\n`;
    const map = loadMarkdown(editor, md);
    expect(editor.view.dom.querySelector('video')?.getAttribute('src')).toBe(`/vault/oh/assets/${FILE}.mp4`);
    expect(toMarkdown(editor, map)).toBe(md);
  });

  it('inserts an uploaded video as its URL on its own line', async () => {
    const { insertAsset } = await import('./media');
    const { editor: e, out } = open('Intro\n');
    e.commands.focus('end');
    insertAsset(e, { file: `${FILE}.webm`, url: `/nests/abc/assets/${FILE}.webm`, markdown: '' }, '');
    expect(out()).toContain(`\n\n/nests/abc/assets/${FILE}.webm\n`);
  });
});
