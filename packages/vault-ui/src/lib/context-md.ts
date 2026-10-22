/** CONTEXT.md may open with a YAML frontmatter block; the editor only touches what follows it. */

export interface ContextMdParts {
  /** The frontmatter block including both fences and its trailing newline, or '' when there is none. */
  head: string;
  body: string;
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitContextMd(raw: string): ContextMdParts {
  const head = FRONTMATTER.exec(raw)?.[0] ?? '';
  return { head, body: raw.slice(head.length) };
}

export function joinContextMd(parts: ContextMdParts): string {
  return parts.head + parts.body;
}
