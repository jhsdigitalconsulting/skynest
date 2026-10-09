import { WIKILINK_SCHEME, parseWikiLink } from '@/lib/vault-ui/wikilinks';

/** The slice of mdast this plugin touches. */
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

// Same pattern as the engine's extractWikiLinks: no `[` or `]` inside, so it can't backtrack.
const WIKILINK = /\[\[([^[\]]+)\]\]/g;

/** Nodes whose text must stay literal. */
const SKIP = new Set(['link', 'linkReference', 'inlineCode', 'code', 'definition', 'html']);

function splitText(value: string): MdNode[] | null {
  const out: MdNode[] = [];
  let last = 0;
  for (const m of value.matchAll(WIKILINK)) {
    const { target, label } = parseWikiLink(m[1]);
    if (!target) continue;
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    out.push({
      type: 'link',
      url: WIKILINK_SCHEME + encodeURIComponent(target),
      children: [{ type: 'text', value: label }],
    });
    last = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node: MdNode) {
  if (!node.children || SKIP.has(node.type)) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value?.includes('[[')) return splitText(child.value) ?? [child];
    walk(child);
    return [child];
  });
}

/** Turns `[[Target]]` and `[[Target|label]]` in text into links to `wikilink:<target>`. */
export function remarkWikiLinks() {
  return (tree: MdNode) => walk(tree);
}
