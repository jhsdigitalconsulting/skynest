import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth/providers/github', () => ({
  default: vi.fn((config) => ({ id: 'github', type: 'oauth', ...config })),
}));

vi.mock('next-auth/providers/microsoft-entra-id', () => ({
  default: vi.fn((config) => ({ id: 'microsoft-entra-id', type: 'oidc', ...config })),
}));

async function loadAuthConfig() {
  const { authConfig } = await import('./auth.config.js');
  return authConfig;
}

/** The mocked providers are plain objects, so read their fields directly. */
interface MockProvider {
  id: string;
  issuer?: string;
}

async function loadProviders(): Promise<MockProvider[]> {
  const authConfig = await loadAuthConfig();
  return authConfig.providers as unknown as MockProvider[];
}

/** Runs the jwt callback and asserts it returned a token. */
async function runJwt(params: unknown) {
  const authConfig = await loadAuthConfig();
  const token = await authConfig.callbacks!.jwt!(params as never);
  if (!token) throw new Error('jwt callback returned no token');
  return token;
}

describe('authConfig provider selection', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AUTH_PROVIDER;
    delete process.env.ENTRA_TENANT_ID;
    delete process.env.ENTRA_CLIENT_ID;
    delete process.env.ENTRA_CLIENT_SECRET;
    process.env.GITHUB_CLIENT_ID = 'gh-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'gh-client-secret';
  });

  it('defaults to a single GitHub provider when AUTH_PROVIDER is unset', async () => {
    const providers = await loadProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('github');
  });

  it('uses a single Microsoft Entra ID provider when AUTH_PROVIDER=entra', async () => {
    process.env.AUTH_PROVIDER = 'entra';
    process.env.ENTRA_TENANT_ID = 'test-tenant';
    process.env.ENTRA_CLIENT_ID = 'entra-client-id';
    process.env.ENTRA_CLIENT_SECRET = 'entra-client-secret';

    const providers = await loadProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('microsoft-entra-id');
    expect(providers[0].issuer).toBe(
      'https://login.microsoftonline.com/test-tenant/v2.0'
    );
  });

  it('throws when AUTH_PROVIDER=entra is missing ENTRA_TENANT_ID', async () => {
    process.env.AUTH_PROVIDER = 'entra';
    await expect(loadAuthConfig()).rejects.toThrow(
      /ENTRA_TENANT_ID is required when AUTH_PROVIDER=entra/
    );
  });
});

describe('authConfig callbacks', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AUTH_PROVIDER;
    process.env.GITHUB_CLIENT_ID = 'gh-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'gh-client-secret';
  });

  it('jwt callback carries a GitHub access token and login into idpAccessToken/idpLogin', async () => {
    const token = await runJwt({
      token: { name: 'Fallback Name' },
      account: { provider: 'github', access_token: 'ghp_abc', login: 'octocat' } as never,
    });
    expect(token.idpAccessToken).toBe('ghp_abc');
    expect(token.idpLogin).toBe('octocat');
  });

  it('jwt callback carries an Entra ID access token and sources idpLogin from preferred_username', async () => {
    const token = await runJwt({
      token: { name: 'Fallback Name' },
      account: { provider: 'microsoft-entra-id', access_token: 'entra_at_abc' } as never,
      profile: { preferred_username: 'jane@contoso.com', email: 'jane@other.com' } as never,
    });
    expect(token.idpAccessToken).toBe('entra_at_abc');
    expect(token.idpLogin).toBe('jane@contoso.com');
  });

  it('jwt callback copies profile.groups into idpGroups when present', async () => {
    const token = await runJwt({
      token: { name: 'Fallback Name' },
      account: { provider: 'microsoft-entra-id', access_token: 'entra_at_abc' } as never,
      profile: { preferred_username: 'jane@contoso.com', groups: ['group-a', 'group-b'] } as never,
    });
    expect(token.idpGroups).toEqual(['group-a', 'group-b']);
  });

  it('jwt callback leaves idpGroups undefined when the profile has no groups claim', async () => {
    const token = await runJwt({
      token: { name: 'Fallback Name' },
      account: { provider: 'microsoft-entra-id', access_token: 'entra_at_abc' } as never,
      profile: { preferred_username: 'jane@contoso.com' } as never,
    });
    expect(token.idpGroups).toBeUndefined();
  });

  it('jwt callback falls back to email when Entra ID profile has no preferred_username', async () => {
    const token = await runJwt({
      token: { name: 'Fallback Name' },
      account: { provider: 'microsoft-entra-id' } as never,
      profile: { email: 'jane@other.com' } as never,
    });
    expect(token.idpLogin).toBe('jane@other.com');
  });

  it('session callback copies idpAccessToken/idpLogin/idpGroups from the token onto the session', async () => {
    const authConfig = await loadAuthConfig();
    const session = await authConfig.callbacks!.session!({
      session: { user: {}, expires: '' } as never,
      token: { idpAccessToken: 'ghp_abc', idpLogin: 'octocat', idpGroups: ['group-a'] } as never,
    } as never);
    expect((session as { idpAccessToken?: string }).idpAccessToken).toBe('ghp_abc');
    expect((session as { idpLogin?: string }).idpLogin).toBe('octocat');
    expect((session as { idpGroups?: string[] }).idpGroups).toEqual(['group-a']);
  });
});
