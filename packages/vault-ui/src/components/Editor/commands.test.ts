import { describe, expect, it } from 'vitest';
import { block, continueList, link, linePrefix, wrap } from './commands';
import type { Edit, Selection } from './commands';

function apply(sel: Selection, edit: Edit) {
  const value = sel.value.slice(0, edit.from) + edit.text + sel.value.slice(edit.to);
  return { value, selected: value.slice(edit.selStart, edit.selEnd) };
}

describe('wrap', () => {
  const bold = wrap('**', '**', 'bold text');

  it('wraps the selection and keeps it selected', () => {
    const sel = { value: 'make this loud', start: 5, end: 9 };
    expect(apply(sel, bold(sel))).toEqual({ value: 'make **this** loud', selected: 'this' });
  });

  it('inserts a selected placeholder when nothing is selected', () => {
    const sel = { value: 'ab', start: 1, end: 1 };
    expect(apply(sel, bold(sel))).toEqual({ value: 'a**bold text**b', selected: 'bold text' });
  });

  it('unwraps an already wrapped selection', () => {
    const sel = { value: 'make **this** loud', start: 7, end: 11 };
    expect(apply(sel, bold(sel))).toEqual({ value: 'make this loud', selected: 'this' });
  });
});

describe('linePrefix', () => {
  const quote = linePrefix('> ', /^>\s?/);
  const numbered = linePrefix((i) => `${i + 1}. `, /^\d+\.\s/);

  it('prefixes every selected line', () => {
    const sel = { value: 'one\ntwo\nthree', start: 1, end: 6 };
    expect(apply(sel, quote(sel)).value).toBe('> one\n> two\nthree');
  });

  it('removes the prefix when every line already has it', () => {
    const sel = { value: '> one\n> two', start: 0, end: 11 };
    expect(apply(sel, quote(sel)).value).toBe('one\ntwo');
  });

  it('numbers lines in order', () => {
    const sel = { value: 'a\nb\nc', start: 0, end: 5 };
    expect(apply(sel, numbered(sel)).value).toBe('1. a\n2. b\n3. c');
  });
});

describe('block', () => {
  it('puts the block on its own paragraph', () => {
    const sel = { value: 'text', start: 4, end: 4 };
    const result = apply(sel, block('```\ncode\n```', 'code')(sel));
    expect(result.value).toBe('text\n\n```\ncode\n```\n\n');
    expect(result.selected).toBe('code');
  });
});

describe('link', () => {
  it('uses the selection as the label and selects the url', () => {
    const sel = { value: 'see docs', start: 4, end: 8 };
    expect(apply(sel, link()(sel))).toEqual({ value: 'see [docs](https://)', selected: 'https://' });
  });

  it('uses a selected url as the target and selects the label', () => {
    const sel = { value: 'https://x.dev', start: 0, end: 13 };
    expect(apply(sel, link()(sel))).toEqual({ value: '[link text](https://x.dev)', selected: 'link text' });
  });
});

describe('continueList', () => {
  it('continues a bullet list', () => {
    const sel = { value: '- one', start: 5, end: 5 };
    expect(apply(sel, continueList(sel)!).value).toBe('- one\n- ');
  });

  it('increments numbered lists and keeps task boxes', () => {
    const numbered = { value: '  9. nine', start: 9, end: 9 };
    expect(apply(numbered, continueList(numbered)!).value).toBe('  9. nine\n  10. ');
    const task = { value: '- [x] done', start: 10, end: 10 };
    expect(apply(task, continueList(task)!).value).toBe('- [x] done\n- [ ] ');
  });

  it('ends the list on an empty item', () => {
    const sel = { value: '- one\n- ', start: 8, end: 8 };
    expect(apply(sel, continueList(sel)!).value).toBe('- one\n');
  });

  it('ignores lines that are not list items', () => {
    expect(continueList({ value: 'plain', start: 5, end: 5 })).toBeNull();
  });
});
