import { Extension, mergeAttributes } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { assetFileFromUrl, isVideoName } from '@/lib/vault-ui/assets';

interface LinkToken {
  raw?: string;
}

/**
 * Bare URLs and emails stay plain text. GFM autolinks them on render anyway, and
 * keeping them as links would serialize `a@b.com` as `[a@b.com](mailto:a@b.com)`.
 */
const VaultLink = Link.extend({
  parseMarkdown(token, helpers) {
    const raw = (token as LinkToken).raw ?? '';
    if (!raw.startsWith('[') || !this.parent) return helpers.parseInline(token.tokens ?? []);
    return this.parent(token, helpers);
  },
}).configure({
  openOnClick: false,
  autolink: false,
  // Vault documents link to each other with contextnest:// URIs.
  protocols: ['contextnest', 'mailto'],
  HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null },
});

/** Maps a stored image or video reference to the URL the browser loads it from. */
export type AssetSrc = (src: string) => string;

/**
 * Images display from `assetSrc(src)` but keep the reference as written, so the
 * markdown never picks up this server's URL — including on copy and paste,
 * which re-parses the rendered HTML (hence `data-src`).
 */
function vaultImage(assetSrc: AssetSrc) {
  return Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        src: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('data-src') ?? el.getAttribute('src'),
          renderHTML: (attrs: { src?: string | null }) =>
            attrs.src ? { src: assetSrc(attrs.src), 'data-src': attrs.src } : {},
        },
      };
    },
    renderHTML({ HTMLAttributes }) {
      return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },
  }).configure({ inline: true });
}

/**
 * Shows a player under a paragraph that holds only a vault video URL — how
 * ContextNest Community embeds videos. The URL stays editable text.
 */
function videoPreviews(assetSrc: AssetSrc) {
  return Extension.create({
    name: 'videoPreviews',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              const decorations: Decoration[] = [];
              state.doc.descendants((node, pos) => {
                if (node.type.name !== 'paragraph') return true;
                const url = node.textContent.trim();
                const file = assetFileFromUrl(url);
                if (file && isVideoName(file)) {
                  const src = assetSrc(url);
                  decorations.push(
                    Decoration.widget(
                      pos + node.nodeSize,
                      () => {
                        const video = document.createElement('video');
                        video.src = src;
                        video.controls = true;
                        video.preload = 'metadata';
                        video.className = 'video-preview';
                        video.contentEditable = 'false';
                        return video;
                      },
                      { key: src, side: -1 },
                    ),
                  );
                }
                return false;
              });
              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}

export function visualExtensions(placeholder: string, assetSrc: AssetSrc = (src) => src) {
  return [
    StarterKit.configure({
      link: false,
      // An always-present empty paragraph at the end would serialize as `&nbsp;`.
      trailingNode: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    VaultLink,
    // Inline, so an image can sit inside a paragraph as it can in markdown.
    vaultImage(assetSrc),
    videoPreviews(assetSrc),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder }),
    Markdown,
  ];
}

const CODE_TYPES = new Set(['code', 'codeBlock']);

/**
 * Escape plain text for markdown with as little noise as possible. The stock
 * encoder turns every `&` into `&amp;` and backslash-escapes `[`, `_` and the
 * like everywhere, which mangles wikilinks (`[[Title]]`) and snake_case words.
 */
export function escapeText(text: string): string {
  return text
    .replace(/&(?=#?[a-z0-9]+;)/gi, '&amp;')
    .replace(/<(?=[a-z/!?])/gi, '&lt;')
    .replace(/\\(?=[\\`*_[\]~])/g, '\\\\')
    .replace(/[`*]/g, '\\$&')
    // A lone `~` (as in "~70") is literal; only pairs can form strikethrough.
    .replace(/~/g, (m, _i: number, all: string) => (all.split('~').length > 2 ? '\\~' : m))
    .replace(/(^|[^\p{L}\p{N}])_|_(?=$|[^\p{L}\p{N}])/gu, (m) => m.replace('_', '\\_'))
    .replace(/(\[\[[^\]\n]+\]\])|[[\]]/g, (m, wikilink: string | undefined) => (wikilink ? m : `\\${m}`));
}

interface TextEncoding {
  encodeTextForMarkdown: (text: string, node: JSONContent, parent?: JSONContent) => string;
}

/** Swap in `escapeText` for the markdown manager's private text encoder. */
export function applyGentleEscaping(editor: Editor) {
  const md = editor.markdown;
  if (!md) return;
  (md as unknown as TextEncoding).encodeTextForMarkdown = (text, node, parent) => {
    const inCode =
      (parent?.type != null && CODE_TYPES.has(parent.type)) ||
      (node.marks ?? []).some((m) => CODE_TYPES.has(typeof m === 'string' ? m : m.type));
    return inCode ? text : escapeText(text);
  };
}
