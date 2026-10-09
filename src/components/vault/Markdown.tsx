import Link from 'next/link';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { assetFileFromUrl } from '@/lib/vault-ui/assets';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { CONTEXTNEST_SCHEME, WIKILINK_SCHEME, resolveVaultHref } from '@/lib/vault-ui/wikilinks';
import type { LinkIndex } from '@/lib/vault-ui/wikilinks';
import { remarkAssetVideos } from './remark-asset-videos';
import { remarkWikiLinks } from './remark-wikilinks';

/** What links between documents need to resolve. */
export interface VaultLinks {
  vaultId: string;
  index: LinkIndex;
}

interface Props {
  source: string;
  className?: string;
  /** Resolves `[[wikilinks]]` and contextnest:// links. Without it they render as plain text. */
  links?: VaultLinks;
}

/** Typography for rendered documents, shared with the visual editor so both look the same. */
export const PROSE_CLASS =
  'prose prose-gray max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-a:text-indigo-600 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-900 prose-table:text-sm';

const PLUGINS = [remarkGfm, remarkWikiLinks, remarkAssetVideos];

// In-vault links are resolved by the `a` renderer, so let their schemes through.
function urlTransform(url: string): string {
  return url.startsWith(WIKILINK_SCHEME) || url.startsWith(CONTEXTNEST_SCHEME) ? url : defaultUrlTransform(url);
}

/** Where the browser loads a stored image or video from: this vault's asset route, whichever nest wrote the reference. */
export function assetSrc(src: string, vaultId: string | undefined): string {
  const file = vaultId ? assetFileFromUrl(src) : null;
  return file && vaultId ? vaultUrls(vaultId).asset(file) : src;
}

function components(links: VaultLinks | undefined): Components {
  return {
    img({ src, alt, node: _node, ...rest }) {
      const resolved = typeof src === 'string' ? assetSrc(src, links?.vaultId) : src;
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary document images, not optimizable assets
      return <img src={resolved} alt={alt ?? ''} {...rest} />;
    },
    video({ src, node: _node, ...rest }) {
      return <video src={typeof src === 'string' ? assetSrc(src, links?.vaultId) : src} className="max-w-full" {...rest} />;
    },
    a({ href = '', children, node: _node, ...rest }) {
      const docId = resolveVaultHref(href, links?.index ?? null);
      if (docId === undefined) {
        return (
          <a href={href} {...rest}>
            {children}
          </a>
        );
      }
      if (docId === null || !links) {
        return (
          <span className="text-gray-500 underline decoration-dotted underline-offset-2" title="Not found in this vault">
            {children}
          </span>
        );
      }
      return <Link href={vaultUrls(links.vaultId).doc(docId)}>{children}</Link>;
    },
  };
}

/** Renders a document body. Raw HTML is not rendered (react-markdown's default), so content can't inject markup. */
export function Markdown({ source, className = '', links }: Props) {
  return (
    <div className={`${PROSE_CLASS} ${className}`}>
      <ReactMarkdown remarkPlugins={PLUGINS} urlTransform={urlTransform} components={components(links)}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
