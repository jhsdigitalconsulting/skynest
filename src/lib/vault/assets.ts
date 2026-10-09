import 'server-only';
import { randomUUID } from 'node:crypto';
import type { StorageProvider } from '@promptowl/contextnest-engine';
import { ASSET_NAME_RE, extensionOf, isVideoName, uploadProblem } from '@/lib/vault-ui/assets';
import type { UploadedAsset } from '@/lib/vault-ui/assets';
import { envForVault } from './registry';
import type { VaultSyncProvider } from './sync/vault-sync-provider';

export class AssetError extends Error {}

/**
 * The nest id written into asset references. Set CONTEXTNEST_NEST_ID_<VAULT> to
 * the vault's ContextNest Community nest id so the references resolve there
 * too; it defaults to the Skynest vault id.
 */
export function nestIdFor(vaultId: string): string {
  return envForVault('CONTEXTNEST_NEST_ID', vaultId) ?? vaultId;
}

export function assetPath(file: string): string {
  if (!ASSET_NAME_RE.test(file)) throw new AssetError('Invalid asset name.');
  return `assets/${file}`;
}

interface StoreParams {
  provider: StorageProvider;
  sync: VaultSyncProvider;
  vaultId: string;
  name: string;
  data: Buffer;
  editedBy: string;
  userToken: string;
}

/** Save an upload under `assets/` and commit it, returning how to reference it. */
export async function storeAsset({ provider, sync, vaultId, name, data, editedBy, userToken }: StoreParams): Promise<UploadedAsset> {
  const problem = uploadProblem(name, data.length);
  if (problem) throw new AssetError(problem);
  const ext = extensionOf(name);
  const file = `${randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const path = assetPath(file);
  await provider.write(path, data);
  await sync.commitFile({ path, content: data, message: `upload ${path}`, editedBy, userToken });

  const url = `/nests/${nestIdFor(vaultId)}/assets/${file}`;
  const alt = name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '');
  return { file, url, markdown: isVideoName(file) ? url : `![${alt}](${url})` };
}
