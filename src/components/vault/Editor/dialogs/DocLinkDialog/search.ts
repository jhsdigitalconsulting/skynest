import type { LinkTarget } from '@/lib/vault-ui/wikilinks';

export function titleOf(doc: LinkTarget): string {
  return doc.title || doc.id.split('/').pop() || doc.id;
}

/** Every search word must appear in the title, id or tags. */
export function searchDocs(docs: LinkTarget[], query: string): LinkTarget[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sorted = [...docs].sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  if (!words.length) return sorted;
  return sorted.filter((d) => {
    const haystack = `${d.title} ${d.id} ${d.tags.join(' ')}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
