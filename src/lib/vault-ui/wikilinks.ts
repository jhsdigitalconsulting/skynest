/**
 * Links between vault documents: `[[Title]]`, `[[Title|label]]`, `[[nodes/id|label]]`
 * and `[text](contextnest://nodes/id)`. Resolution matches the engine's wiki graph
 * (`resolveWikiSeeds`): an exact id wins, then an exact title, then a
 * case-insensitive title.
 *
 * Pure and serializable so the index can be built on the server and handed to
 * client components such as the editor preview.
 */

/** A document that can be linked to, as the document picker lists it. */
export interface LinkTarget {
  id: string;
  /** Frontmatter title, or empty when the document has none. */
  title: string;
  tags: string[];
}

export interface LinkIndex {
  docs: LinkTarget[];
}

interface LinkableDoc {
  id: string;
  frontmatter: { title?: string; tags?: string[] };
}

export const CONTEXTNEST_SCHEME = 'contextnest://';
/** Internal href for a `[[wikilink]]`, carrying its raw target until it's resolved. */
export const WIKILINK_SCHEME = 'wikilink:';

export function buildLinkIndex(docs: LinkableDoc[]): LinkIndex {
  return {
    docs: docs.map((d) => ({ id: d.id, title: d.frontmatter.title?.trim() ?? '', tags: d.frontmatter.tags ?? [] })),
  };
}

interface Lookup {
  ids: Set<string>;
  exact: Map<string, string>;
  lower: Map<string, string>;
}

const lookups = new WeakMap<LinkIndex, Lookup>();

function lookupFor(index: LinkIndex): Lookup {
  let lookup = lookups.get(index);
  if (!lookup) {
    lookup = { ids: new Set(), exact: new Map(), lower: new Map() };
    for (const { id, title } of index.docs) {
      lookup.ids.add(id);
      // The first document with a title wins, as in the engine.
      if (!title) continue;
      if (!lookup.exact.has(title)) lookup.exact.set(title, id);
      if (!lookup.lower.has(title.toLowerCase())) lookup.lower.set(title.toLowerCase(), id);
    }
    lookups.set(index, lookup);
  }
  return lookup;
}

/** The `contextnest://` URI for a document id. */
export function contextnestHref(id: string): string {
  return CONTEXTNEST_SCHEME + id;
}

/** The document id a wikilink target (a title or an id) points to, or null if it's dangling. */
export function resolveWikiTarget(target: string, index: LinkIndex): string | null {
  const t = target.trim();
  const { ids, exact, lower } = lookupFor(index);
  if (ids.has(t)) return t;
  return exact.get(t) ?? lower.get(t.toLowerCase()) ?? null;
}

/** The target and visible label of a wikilink body (the text between `[[` and `]]`). */
export function parseWikiLink(inner: string): { target: string; label: string } {
  const bar = inner.indexOf('|');
  const target = (bar === -1 ? inner : inner.slice(0, bar)).trim();
  const label = bar === -1 ? target : inner.slice(bar + 1).trim() || target;
  return { target, label };
}

/**
 * The document id an in-vault href points to: `wikilink:<target>` or
 * `contextnest://<id>`. Returns undefined for any other href and null for an
 * in-vault link that doesn't resolve.
 */
export function resolveVaultHref(href: string, index: LinkIndex | null): string | null | undefined {
  let target: string;
  if (href.startsWith(WIKILINK_SCHEME)) target = decodeURIComponent(href.slice(WIKILINK_SCHEME.length));
  else if (href.startsWith(CONTEXTNEST_SCHEME)) target = href.slice(CONTEXTNEST_SCHEME.length).split(/[?#]/)[0];
  else return undefined;
  return index ? resolveWikiTarget(target, index) : null;
}
