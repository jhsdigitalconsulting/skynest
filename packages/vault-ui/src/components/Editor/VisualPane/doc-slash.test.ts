// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { visualExtensions } from './extensions';
import { docSlash } from './doc-slash';
import type { DocSlashState } from './doc-slash';

let editor: Editor | null = null;

/** Type `text` at the end of a paragraph holding `before`; returns the last menu state reported. */
function typeAfter(before: string, text: string, { code = false } = {}): DocSlashState | null {
  let last: DocSlashState | null = null;
  const bridge = { current: { onChange: (s: DocSlashState | null) => (last = s), onKeyDown: () => false } };
  editor = new Editor({ element: document.createElement('div'), extensions: [...visualExtensions(''), docSlash(bridge)] });
  editor.commands.setContent(code ? `<pre><code>${before}</code></pre>` : `<p>${before}</p>`);
  editor.commands.focus('end');
  for (const ch of text) editor.commands.insertContent(ch);
  return last;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('docSlash', () => {
  it('opens at the start of a line and tracks the query', () => {
    expect(typeAfter('', '/loc')?.query).toBe('loc');
  });

  it('opens after a space', () => {
    expect(typeAfter('see', ' /care')?.query).toBe('care');
  });

  it('stays closed in the middle of a word, like and/or', () => {
    expect(typeAfter('and', '/or')).toBeNull();
  });

  it('stays closed inside a code block', () => {
    expect(typeAfter('', '/usr', { code: true })).toBeNull();
  });
});
