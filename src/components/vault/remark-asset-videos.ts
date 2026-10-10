import { assetFileFromUrl, isVideoName } from '@/lib/vault-ui/assets';

/** The slice of mdast this plugin touches. */
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

/**
 * A paragraph holding nothing but a vault video URL becomes a `<video>` player,
 * which is how ContextNest Community embeds uploaded videos.
 */
export function remarkAssetVideos() {
  return (tree: MdNode) => {
    const visit = (node: MdNode) => {
      for (const child of node.children ?? []) {
        const only = child.type === 'paragraph' && child.children?.length === 1 ? child.children[0] : null;
        const url = only?.type === 'text' ? (only.value ?? '').trim() : '';
        const file = url ? assetFileFromUrl(url) : null;
        if (file && isVideoName(file)) {
          child.children = [];
          child.data = { hName: 'video', hProperties: { src: url, controls: true, preload: 'metadata' } };
        } else {
          visit(child);
        }
      }
    };
    visit(tree);
  };
}
