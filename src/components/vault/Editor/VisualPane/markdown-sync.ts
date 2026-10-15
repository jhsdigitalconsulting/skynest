/**
 * Markdown <-> Tiptap conversion that keeps diffs small.
 *
 * Re-serializing a whole document reformats it: tables get re-padded, list
 * indentation and emphasis markers change, and bare URLs become `[url](url)`.
 * A one-word edit would then show up in review as a rewrite of the whole
 * document. So `loadMarkdown` remembers the original source of every top-level
 * block, and `toMarkdown` emits that source verbatim for any block the user
 * didn't change. Only edited or new blocks go through the serializer.
 */

import type { Editor, JSONContent } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { columnPixelWidths, dashesForPixels } from '@/lib/vault-ui/table-widths';

/** The editor's minimum column width in pixels (see the table extension in extensions.ts). */
export const CELL_MIN_WIDTH = 120;

interface SourceBlock {
  /** Position in the original document, to know when two blocks were adjacent. */
  index: number;
  /** The block's markdown, without trailing newlines. */
  raw: string;
  /** The whitespace that followed it. */
  sep: string;
}

export interface SourceMap {
  /** Original blocks, keyed by their serialized ProseMirror JSON. */
  blocks: Map<string, SourceBlock[]>;
  leading: string;
  trailingNewline: boolean;
}

interface Chunk {
  raw: string;
  sep: string;
}

interface LexToken {
  type: string;
  raw: string;
}

const EMPTY_MAP = (markdown: string): SourceMap => ({
  blocks: new Map(),
  leading: '',
  trailingNewline: markdown.endsWith('\n'),
});

function manager(editor: Editor) {
  const md = editor.markdown;
  if (!md) throw new Error('The Markdown extension is not registered on this editor.');
  return md;
}

/** Split markdown into top-level blocks, each with the whitespace that follows it. */
function chunk(editor: Editor, markdown: string): { leading: string; chunks: Chunk[] } | null {
  const tokens = manager(editor).instance.lexer(markdown) as unknown as LexToken[];
  // The lexer normalizes some input (e.g. CRLF); only trust it when it accounts for every character.
  if (tokens.map((t) => t.raw).join('') !== markdown) return null;

  let leading = '';
  const chunks: Chunk[] = [];
  for (const token of tokens) {
    if (token.type === 'space') {
      if (chunks.length) chunks[chunks.length - 1].sep += token.raw;
      else leading += token.raw;
      continue;
    }
    const trailing = token.raw.match(/\n*$/)?.[0] ?? '';
    chunks.push({ raw: token.raw.slice(0, token.raw.length - trailing.length), sep: trailing });
  }
  return { leading, chunks };
}

/**
 * `|  a   | b |` -> `| a | b |`, and `| ----- |` -> `| --- |` (keeping alignment colons).
 * `dashes` sets each column's separator length instead, to carry column widths.
 */
export function compactTable(markdown: string, dashes?: number[]): string {
  return markdown
    .split('\n')
    .map((line) => {
      if (!line.startsWith('|')) return line;
      const cells = line
        .slice(1, line.trimEnd().endsWith('|') ? line.trimEnd().length - 1 : undefined)
        .split(/(?<!\\)\|/)
        .map((c) => c.trim())
        .map((c, i) => {
          if (!/^:?-+:?$/.test(c)) return c;
          return `${c.startsWith(':') ? ':' : ''}${'-'.repeat(dashes?.[i] ?? 3)}${c.endsWith(':') ? ':' : ''}`;
        });
      return `|${cells.map((c) => (c ? ` ${c} ` : ' ')).join('|')}|`;
    })
    .join('\n');
}

/** Separator dashes for a table's columns, from the widths dragged in the editor; null when none were set. */
function tableDashes(table: PmNode): number[] | null {
  const row = table.firstChild;
  if (!row) return null;
  const widths: (number | null)[] = [];
  row.forEach((cell) => widths.push((cell.attrs.colwidth as number[] | null)?.[0] ?? null));
  if (widths.every((w) => w === null)) return null;
  return widths.map((w) => dashesForPixels(w ?? CELL_MIN_WIDTH));
}

/** Give every cell its column's width from the table markdown's separator row. */
function applyColumnWidths(table: JSONContent, markdown: string): void {
  const widths = columnPixelWidths(markdown, CELL_MIN_WIDTH);
  if (!widths) return;
  for (const row of table.content ?? []) {
    (row.content ?? []).forEach((cell, i) => {
      if (widths[i]) cell.attrs = { ...cell.attrs, colwidth: [widths[i]] };
    });
  }
}

function keyOf(editor: Editor, node: JSONContent): string | null {
  try {
    return JSON.stringify(editor.schema.nodeFromJSON(node).toJSON());
  } catch {
    return null;
  }
}

/** Load markdown into the editor (without firing an update) and return the map `toMarkdown` needs. */
export function loadMarkdown(editor: Editor, markdown: string): SourceMap {
  const split = chunk(editor, markdown);
  if (!split) {
    editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
    return EMPTY_MAP(markdown);
  }

  const map: SourceMap = { blocks: new Map(), leading: split.leading, trailingNewline: markdown.endsWith('\n') };
  const content: JSONContent[] = [];
  split.chunks.forEach((c, index) => {
    const nodes = manager(editor).parse(c.raw).content ?? [];
    if (nodes.length === 1 && nodes[0].type === 'table') applyColumnWidths(nodes[0], c.raw);
    content.push(...nodes);
    // A chunk that became several nodes (or none) can't be matched back reliably; it's re-serialized.
    if (nodes.length !== 1) return;
    const key = keyOf(editor, nodes[0]);
    if (!key) return;
    const list = map.blocks.get(key) ?? [];
    list.push({ index, raw: c.raw, sep: c.sep });
    map.blocks.set(key, list);
  });

  editor.commands.setContent({ type: 'doc', content }, { emitUpdate: false });
  return map;
}

/** Serialize the editor's document, reusing the original source for unchanged blocks. */
export function toMarkdown(editor: Editor, map: SourceMap): string {
  const used = new Map<string, number>();
  let out = '';
  let prev: SourceBlock | null = null;
  let maxIndex = -1;
  for (const list of map.blocks.values()) for (const b of list) maxIndex = Math.max(maxIndex, b.index);

  const { doc } = editor.state;
  for (let i = 0; i < doc.childCount; i++) {
    const node = doc.child(i);
    // Empty paragraphs are just spacing in the editor; markdown has no equivalent.
    if (node.type.name === 'paragraph' && node.childCount === 0) continue;

    const json = node.toJSON() as JSONContent;
    const key = JSON.stringify(json);
    const candidates = map.blocks.get(key);
    const n = used.get(key) ?? 0;
    const original = candidates && n < candidates.length ? candidates[n] : null;
    if (original) used.set(key, n + 1);

    let text = original ? original.raw : manager(editor).serialize({ type: 'doc', content: [json] }).replace(/^\n+|\n+$/g, '');
    if (!original && node.type.name === 'table') text = compactTable(text, tableDashes(node) ?? undefined);
    if (!text) continue;

    if (out) out += prev && original && original.index === prev.index + 1 ? prev.sep : '\n\n';
    out += text;
    prev = original;
  }

  if (!out) return '';
  const end = prev && prev.index === maxIndex ? prev.sep : map.trailingNewline ? '\n' : '';
  return map.leading + out + end;
}
