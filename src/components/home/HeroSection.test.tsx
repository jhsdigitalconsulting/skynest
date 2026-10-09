import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signOut: vi.fn() }));

import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('is branded for Orlando Health MarTech', () => {
    const html = renderToStaticMarkup(<HeroSection />);
    expect(html).toContain('Orlando Health MarTech');
    expect(html).toContain('Context Hub');
  });

  it('leads with a Log in button when signed out', () => {
    const html = renderToStaticMarkup(<HeroSection />);
    expect(html).toContain('href="/auth/signin?callbackUrl=/vault"');
    expect(html).toContain('Log in');
    expect(html).not.toContain('Open vault');
  });

  it('leads with Open vault when signed in', () => {
    const html = renderToStaticMarkup(<HeroSection signedIn />);
    expect(html).toContain('href="/vault"');
    expect(html).toContain('Open vault');
    expect(html).not.toContain('Log in');
  });

  it('keeps a link to the connection docs', () => {
    expect(renderToStaticMarkup(<HeroSection />)).toContain('href="/docs"');
  });
});
