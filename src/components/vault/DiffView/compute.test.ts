import { describe, expect, it } from 'vitest';
import { collapse, computeDiff } from './compute';

describe('computeDiff', () => {
  it('reports no changes for identical text', () => {
    const { lines, stats } = computeDiff('a\nb', 'a\nb');
    expect(stats).toEqual({ added: 0, removed: 0 });
    expect(lines.every((l) => l.kind === 'ctx')).toBe(true);
  });

  it('numbers old and new lines independently', () => {
    const { lines, stats } = computeDiff('a\nb\nc', 'a\nc\nd');
    expect(stats).toEqual({ added: 1, removed: 1 });
    expect(lines.map((l) => [l.kind, l.oldNo, l.newNo, l.text])).toEqual([
      ['ctx', 1, 1, 'a'],
      ['del', 2, null, 'b'],
      ['ctx', 3, 2, 'c'],
      ['add', null, 3, 'd'],
    ]);
  });

  it('highlights the changed words of a modified line', () => {
    const { lines } = computeDiff('the quick brown fox', 'the quick red fox');
    const add = lines.find((l) => l.kind === 'add');
    expect(add?.segments?.filter((s) => s.changed).map((s) => s.text)).toEqual(['red']);
  });

  it('skips word highlights when a line is rewritten entirely', () => {
    const { lines } = computeDiff('alpha', 'something completely different');
    expect(lines.find((l) => l.kind === 'add')?.segments).toBeUndefined();
  });

  it('treats everything as added for a new document', () => {
    expect(computeDiff('', 'one\ntwo').stats).toEqual({ added: 2, removed: 0 });
  });
});

describe('collapse', () => {
  it('folds unchanged runs far from any change', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const after = before.replace('line 10', 'changed');
    const rows = collapse(computeDiff(before, after).lines, 2);
    const gaps = rows.filter((r) => r.kind === 'gap');
    expect(gaps).toHaveLength(2);
    expect(gaps.map((g) => (g.kind === 'gap' ? g.lines.length : 0))).toEqual([8, 7]);
  });

  it('does not fold tiny gaps', () => {
    const rows = collapse(computeDiff('a\nb\nc\nd', 'x\nb\nc\nd').lines, 1);
    expect(rows.some((r) => r.kind === 'gap')).toBe(false);
  });
});
