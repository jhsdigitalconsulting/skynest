/**
 * Column widths for markdown tables. Markdown has nowhere to store them, so they
 * ride in the separator row: the number of dashes in each column's cell is its
 * relative width (`| --- | ------ |` makes the second column twice as wide).
 * A table whose separator cells are all the same length has no custom widths.
 */

/** Editor pixels per dash. */
export const PX_PER_DASH = 10;
export const MIN_DASHES = 3;

/** Split a table row into its trimmed cells, without the outer pipes. */
function cellsOf(line: string): string[] {
  const text = line.trim();
  const inner = text.slice(text.startsWith('|') ? 1 : 0, text.endsWith('|') && !text.endsWith('\\|') ? -1 : undefined);
  return inner.split(/(?<!\\)\|/).map((c) => c.trim());
}

/** Dashes per column in a separator row, or null when it's an ordinary table or not a separator. */
export function separatorDashes(line: string): number[] | null {
  const cells = cellsOf(line);
  if (cells.length < 2 || !cells.every((c) => /^:?-+:?$/.test(c))) return null;
  const dashes = cells.map((c) => c.replace(/:/g, '').length);
  return dashes.every((d) => d === dashes[0]) ? null : dashes;
}

/** The separator row's line within a table's markdown (its second line). */
export function separatorLine(tableMarkdown: string): string {
  return tableMarkdown.split('\n')[1] ?? '';
}

/** Editor pixel widths for a table's markdown, or null when it has no custom widths. */
export function columnPixelWidths(tableMarkdown: string, minPx: number): number[] | null {
  const dashes = separatorDashes(separatorLine(tableMarkdown));
  return dashes && dashes.map((d) => Math.max(minPx, d * PX_PER_DASH));
}

/** The dashes to write for a column of `px` pixels. */
export function dashesForPixels(px: number): number {
  return Math.max(MIN_DASHES, Math.round(px / PX_PER_DASH));
}
