import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageProvider } from '@promptowl/contextnest-engine';
import type { VaultSyncProvider } from './sync/vault-sync-provider';

vi.mock('server-only', () => ({}));
const { AssetError, assetPath, storeAsset } = await import('./assets');

function setup() {
  const write = vi.fn(async () => {});
  const commitFile = vi.fn(async () => ({}));
  const provider = { write } as unknown as StorageProvider;
  const sync = { commitFile } as unknown as VaultSyncProvider;
  const store = (name: string, size = 4) =>
    storeAsset({ provider, sync, vaultId: 'oh', name, data: Buffer.alloc(size), editedBy: 'me', userToken: 't' });
  return { write, commitFile, store };
}

afterEach(() => {
  delete process.env.CONTEXTNEST_NEST_ID_OH;
});

describe('storeAsset', () => {
  it('saves and commits an image under assets/ with a uuid name', async () => {
    const { write, commitFile, store } = setup();
    const asset = await store('Team [photo].jpeg');
    expect(asset.file).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(asset.url).toBe(`/nests/oh/assets/${asset.file}`);
    expect(asset.markdown).toBe(`![Team photo](${asset.url})`);
    expect(write).toHaveBeenCalledWith(`assets/${asset.file}`, expect.any(Buffer));
    expect(commitFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: `assets/${asset.file}`, editedBy: 'me', userToken: 't' }),
    );
  });

  it('writes the Community nest id when one is configured, and a bare URL for video', async () => {
    process.env.CONTEXTNEST_NEST_ID_OH = '7d3e1c2a-4b5f-4e6a-8c9d-0e1f2a3b4c5d';
    const asset = await setup().store('clip.mp4');
    expect(asset.url).toBe(`/nests/7d3e1c2a-4b5f-4e6a-8c9d-0e1f2a3b4c5d/assets/${asset.file}`);
    expect(asset.markdown).toBe(asset.url);
  });

  it('rejects unsupported and oversized files without writing', async () => {
    const { write, store } = setup();
    await expect(store('a.svg')).rejects.toBeInstanceOf(AssetError);
    await expect(store('a.png', 10 * 1024 * 1024 + 1)).rejects.toBeInstanceOf(AssetError);
    expect(write).not.toHaveBeenCalled();
  });

  it('only serves well-formed asset names', () => {
    expect(() => assetPath('../secrets.png')).toThrow(AssetError);
    expect(assetPath('2f0c6a8e-1b2d-4c3e-9f4a-5b6c7d8e9f01.png')).toBe('assets/2f0c6a8e-1b2d-4c3e-9f4a-5b6c7d8e9f01.png');
  });
});
