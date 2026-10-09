/**
 * Markdown formatting commands. Each takes the textarea's value and selection
 * and returns the range to replace plus where the selection should land, so
 * the caller can apply it with `insertText` and keep native undo working.
 */

export interface Selection {
  value: string;
  start: number;
  end: number;
}

export interface Edit {
  /** Range of the original value to replace. */
  from: number;
  to: number;
  text: string;
  /** Selection after the edit, in the new value. */
  selStart: number;
  selEnd: number;
}

export type Command = (sel: Selection) => Edit;

/** Wrap the selection (or a placeholder) in inline markers, or unwrap if already wrapped. */
export function wrap(before: string, after: string, placeholder: string): Command {
  return ({ value, start, end }) => {
    const selected = value.slice(start, end);
    const outer = value.slice(start - before.length, end + after.length);
    if (selected && outer === `${before}${selected}${after}`) {
      return { from: start - before.length, to: end + after.length, text: selected, selStart: start - before.length, selEnd: end - before.length };
    }
    const inner = selected || placeholder;
    return {
      from: start,
      to: end,
      text: `${before}${inner}${after}`,
      selStart: start + before.length,
      selEnd: start + before.length + inner.length,
    };
  };
}

function lineBounds(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const nl = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  return { from, to: nl === -1 ? value.length : nl };
}

/**
 * Toggle a prefix on every selected line. `prefix` may be a function of the
 * line index (for numbered lists). `strip` recognizes any existing prefix of
 * this family (e.g. any heading level) so it can be replaced or removed.
 */
export function linePrefix(prefix: string | ((i: number) => string), strip: RegExp): Command {
  return ({ value, start, end }) => {
    const { from, to } = lineBounds(value, start, end);
    const lines = value.slice(from, to).split('\n');
    const make = typeof prefix === 'function' ? prefix : () => prefix;
    const allHave = lines.every((l, i) => l.startsWith(make(i)));
    const next = lines
      .map((l, i) => {
        const bare = l.replace(strip, '');
        return allHave ? bare : `${make(i)}${bare}`;
      })
      .join('\n');
    return { from, to, text: next, selStart: from, selEnd: from + next.length };
  };
}

/** Insert a block on its own lines, selecting `select` within it. */
export function block(text: string, select?: string): Command {
  return ({ value, start, end }) => {
    const lead = start > 0 && value[start - 1] !== '\n' ? '\n\n' : start > 1 && value[start - 2] !== '\n' ? '\n' : '';
    const trail = value[end] === '\n' ? '\n' : '\n\n';
    const inserted = `${lead}${text}${trail}`;
    const offset = select ? inserted.indexOf(select) : lead.length + text.length;
    return {
      from: start,
      to: end,
      text: inserted,
      selStart: start + offset,
      selEnd: start + offset + (select?.length ?? 0),
    };
  };
}

export function link(): Command {
  return ({ value, start, end }) => {
    const selected = value.slice(start, end);
    const isUrl = /^https?:\/\//.test(selected);
    const label = isUrl ? 'link text' : selected || 'link text';
    const url = isUrl ? selected : 'https://';
    const text = `[${label}](${url})`;
    // Select whichever part still needs typing.
    const selStart = isUrl || !selected ? start + 1 : start + label.length + 3;
    const selEnd = isUrl || !selected ? start + 1 + label.length : selStart + url.length;
    return { from: start, to: end, text, selStart, selEnd };
  };
}

/** Link the selection (or `label` when nothing is selected) to `href`, leaving the cursor after it. */
export function linkTo(href: string, label: string): Command {
  return ({ value, start, end }) => {
    const text = `[${value.slice(start, end) || label}](${href})`;
    return { from: start, to: end, text, selStart: start + text.length, selEnd: start + text.length };
  };
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])(\s+\[[ xX]\])?\s+/;

/**
 * Continue a list when Enter is pressed at the end of a list item; pressing
 * Enter on an empty item ends the list instead. Returns null when not in a list.
 */
export function continueList({ value, start, end }: Selection): Edit | null {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const line = value.slice(lineStart, start);
  const m = LIST_ITEM.exec(line);
  if (!m) return null;
  if (line.length === m[0].length) {
    return { from: lineStart, to: start, text: '', selStart: lineStart, selEnd: lineStart };
  }
  const [, indent, marker, task] = m;
  const num = /^\d+/.exec(marker);
  const nextMarker = num ? `${Number(num[0]) + 1}${marker.slice(num[0].length)}` : marker;
  const text = `\n${indent}${nextMarker}${task ? ' [ ]' : ''} `;
  return { from: start, to: end, text, selStart: start + text.length, selEnd: start + text.length };
}
