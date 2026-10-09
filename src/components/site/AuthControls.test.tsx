import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signOut: vi.fn() }));

import { AuthControlsView, LOGIN_HREF } from './AuthControls';

describe('AuthControlsView', () => {
  it('shows a Log in link to the sign-in page when signed out', () => {
    const html = renderToStaticMarkup(<AuthControlsView />);
    expect(html).toContain(`href="${LOGIN_HREF}"`);
    expect(html).toContain('Log in');
    expect(html).not.toContain('Sign out');
  });

  it('shows the user name and a Sign out button when signed in', () => {
    const html = renderToStaticMarkup(<AuthControlsView userName="Ada Lovelace" signOutAction={async () => {}} />);
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Sign out');
    expect(html).not.toContain('Log in');
  });
});
