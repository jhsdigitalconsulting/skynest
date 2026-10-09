import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildLinkIndex } from '@/lib/vault-ui/wikilinks';
import { Markdown } from './Markdown';

const links = {
  vaultId: 'oh',
  index: buildLinkIndex([{ id: 'nodes/systems/builder', frontmatter: { title: 'System: Builder.io' } }]),
};

const render = (source: string, withLinks = true) =>
  renderToStaticMarkup(<Markdown source={source} links={withLinks ? links : undefined} />);

describe('Markdown links', () => {
  it('renders wikilinks as links to the document, without brackets', () => {
    const html = render('| System |\n| --- |\n| [[System: Builder.io]] |');
    expect(html).toContain('<a href="/vault/oh/doc/nodes/systems/builder">System: Builder.io</a>');
    expect(html).not.toContain('[[');
  });

  it('uses the alias and resolves contextnest:// links', () => {
    expect(render('[[nodes/systems/builder|Builder]]')).toContain('<a href="/vault/oh/doc/nodes/systems/builder">Builder</a>');
    expect(render('[CMS](contextnest://nodes/systems/builder)')).toContain(
      '<a href="/vault/oh/doc/nodes/systems/builder">CMS</a>',
    );
  });

  it('marks dangling links and leaves code alone', () => {
    expect(render('[[Nope]]')).toContain('title="Not found in this vault">Nope</span>');
    expect(render('`[[System: Builder.io]]`')).toContain('<code>[[System: Builder.io]]</code>');
  });

  it('keeps ordinary links', () => {
    expect(render('[x](https://example.com)')).toContain('<a href="https://example.com">x</a>');
  });
});

describe('Markdown assets', () => {
  const FILE = '2f0c6a8e-1b2d-4c3e-9f4a-5b6c7d8e9f01';

  it('serves vault images from this vault, whichever nest wrote them', () => {
    expect(render(`![chart](/nests/7d3e1c2a-4b5f-4e6a-8c9d-0e1f2a3b4c5d/assets/${FILE}.png)`)).toContain(
      `<img src="/vault/oh/assets/${FILE}.png" alt="chart"/>`,
    );
    expect(render('![x](https://example.com/x.png)')).toContain('<img src="https://example.com/x.png"');
  });

  it('plays a video URL on its own line', () => {
    const html = render(`Intro\n\n/nests/abc/assets/${FILE}.mp4\n\nAfter /nests/abc/assets/${FILE}.mp4 inline`);
    expect(html).toContain(`<video src="/vault/oh/assets/${FILE}.mp4" class="max-w-full" controls="" preload="metadata"></video>`);
    expect(html).toContain(`After /nests/abc/assets/${FILE}.mp4 inline`);
  });
});
