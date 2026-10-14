import type { LinkTarget } from './wikilinks';

export interface TagCount {
  /** Without the leading "#". */
  tag: string;
  /** How many documents carry it. */
  count: number;
}

export const MAX_TAG_SUGGESTIONS = 8;

/** A tag as typed → its stored form: no "#", whitespace becomes "-". */
export function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');
}

/** Every tag in use across the vault, most-used first. Tags differing only by case count as one. */
export function tagVocabulary(docs: LinkTarget[]): TagCount[] {
  const byKey = new Map<string, { counts: Map<string, number>; total: number }>();
  for (const doc of docs) {
    for (const raw of doc.tags) {
      const tag = cleanTag(raw);
      if (!tag) continue;
      const entry = byKey.get(tag.toLowerCase()) ?? { counts: new Map(), total: 0 };
      entry.counts.set(tag, (entry.counts.get(tag) ?? 0) + 1);
      entry.total += 1;
      byKey.set(tag.toLowerCase(), entry);
    }
  }
  return [...byKey.values()]
    .map(({ counts, total }) => ({
      // The spelling most documents use.
      tag: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      count: total,
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The vault's spelling of `raw` if it already has that tag (ignoring case), so "Ontology" doesn't fork "ontology". */
export function canonicalTag(vocabulary: TagCount[], raw: string): string {
  const tag = cleanTag(raw);
  const known = vocabulary.find((v) => v.tag.toLowerCase() === tag.toLowerCase());
  return known ? known.tag : tag;
}

/** Existing tags matching `query` that aren't already applied: prefix hits first, then contains, each most-used first. */
export function suggestTags(
  vocabulary: TagCount[],
  applied: string[],
  query: string,
  limit = MAX_TAG_SUGGESTIONS,
): TagCount[] {
  const q = cleanTag(query).toLowerCase();
  const taken = new Set(applied.map((t) => cleanTag(t).toLowerCase()));
  const open = vocabulary.filter((v) => !taken.has(v.tag.toLowerCase()));
  if (!q) return open.slice(0, limit);
  const starts = open.filter((v) => v.tag.toLowerCase().startsWith(q));
  const contains = open.filter((v) => !v.tag.toLowerCase().startsWith(q) && v.tag.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
