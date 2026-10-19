import { diffLines, diffWordsWithSpace } from 'diff';

export interface Segment {
  text: string;
  changed: boolean;
}

export interface DiffLine {
  kind: 'ctx' | 'add' | 'del';
  oldNo: number | null;
  newNo: number | null;
  text: string;
  /** Word-level highlights when the line is one half of a modified pair. */
  segments?: Segment[];
}

export type DiffRow = DiffLine | { kind: 'gap'; lines: DiffLine[] };

export interface DiffStats {
  added: number;
  removed: number;
}

function splitLines(value: string): string[] {
  return value.replace(/\n$/, '').split('\n');
}

/** Word-level segments for a removed line and the added line that replaced it. */
function wordSegments(before: string, after: string): { del: Segment[]; add: Segment[] } {
  const parts = diffWordsWithSpace(before, after);
  const del: Segment[] = [];
  const add: Segment[] = [];
  for (const p of parts) {
    if (!p.added) del.push({ text: p.value, changed: !!p.removed });
    if (!p.removed) add.push({ text: p.value, changed: !!p.added });
  }
  // Highlighting a line that changed almost entirely is just noise.
  const changedChars = add.filter((s) => s.changed).reduce((n, s) => n + s.text.length, 0);
  if (changedChars > after.length * 0.7) return { del: [], add: [] };
  return { del, add };
}

/** End non-empty text with exactly one newline, so a missing final newline isn't reported as a change. */
function terminate(value: string): string {
  return value === '' ? '' : `${value.replace(/\n+$/, '')}\n`;
}

export function computeDiff(before: string, after: string): { lines: DiffLine[]; stats: DiffStats } {
  const parts = diffLines(terminate(before), terminate(after));
  const lines: DiffLine[] = [];
  const stats: DiffStats = { added: 0, removed: 0 };
  let oldNo = 1;
  let newNo = 1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    if (part.removed && next?.added) {
      const dels = splitLines(part.value);
      const adds = splitLines(next.value);
      const pairs = Math.min(dels.length, adds.length);
      const segs = Array.from({ length: pairs }, (_, j) => wordSegments(dels[j], adds[j]));
      dels.forEach((text, j) => {
        const s = segs[j]?.del;
        lines.push({ kind: 'del', oldNo: oldNo++, newNo: null, text, segments: s?.length ? s : undefined });
      });
      adds.forEach((text, j) => {
        const s = segs[j]?.add;
        lines.push({ kind: 'add', oldNo: null, newNo: newNo++, text, segments: s?.length ? s : undefined });
      });
      stats.removed += dels.length;
      stats.added += adds.length;
      i++;
      continue;
    }
    for (const text of splitLines(part.value)) {
      if (part.added) {
        lines.push({ kind: 'add', oldNo: null, newNo: newNo++, text });
        stats.added++;
      } else if (part.removed) {
        lines.push({ kind: 'del', oldNo: oldNo++, newNo: null, text });
        stats.removed++;
      } else {
        lines.push({ kind: 'ctx', oldNo: oldNo++, newNo: newNo++, text });
      }
    }
  }
  return { lines, stats };
}

/** Fold runs of unchanged lines that are more than `context` lines away from any change. */
export function collapse(lines: DiffLine[], context = 3): DiffRow[] {
  const near = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.kind === 'ctx') return;
    for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) near[j] = true;
  });
  const rows: DiffRow[] = [];
  let gap: DiffLine[] = [];
  const flush = () => {
    if (!gap.length) return;
    // A fold that hides one or two lines saves nothing.
    if (gap.length <= 2) rows.push(...gap);
    else rows.push({ kind: 'gap', lines: gap });
    gap = [];
  };
  lines.forEach((line, i) => {
    if (line.kind === 'ctx' && !near[i]) gap.push(line);
    else {
      flush();
      rows.push(line);
    }
  });
  flush();
  return rows;
}
