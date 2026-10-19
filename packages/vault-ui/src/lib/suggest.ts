import type { LinkTarget } from './wikilinks';

export const MAX_SUGGESTIONS = 8;

function titleOf(doc: LinkTarget): string {
  return doc.title || doc.id.split('/').pop() || doc.id;
}

/**
 * Typeahead matches for the header search. Every word must appear in the title,
 * path or tags; title-prefix hits rank first, then title hits, then path/tags.
 */
export function suggestDocs(docs: LinkTarget[], query: string, limit = MAX_SUGGESTIONS): LinkTarget[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { doc: LinkTarget; score: number }[] = [];
  for (const doc of docs) {
    const title = titleOf(doc).toLowerCase();
    const id = doc.id.toLowerCase();
    const tags = doc.tags.join(' ').toLowerCase();
    let score = 0;
    let all = true;
    for (const w of words) {
      if (title.startsWith(w) || title.includes(` ${w}`)) score += 10;
      else if (title.includes(w)) score += 6;
      else if (id.includes(w)) score += 3;
      else if (tags.includes(w)) score += 2;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ doc, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || titleOf(a.doc).localeCompare(titleOf(b.doc)))
    .slice(0, limit)
    .map((s) => s.doc);
}
