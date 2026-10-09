import { BlobStorageProvider } from './blob-storage-provider.js';
import { AzureBlobStorageProvider } from './azure-blob-storage-provider.js';
import { FsStorageProvider } from '@promptowl/contextnest-engine';
import type { StorageProvider } from '@promptowl/contextnest-engine';
import { envForVault, validateVaultId } from '../registry.js';

export { validateVaultId };

export function createStorageProvider(vaultId?: string): StorageProvider {
  const storage = process.env.CONTEXTNEST_STORAGE ?? 'blob';

  if (storage === 'blob') {
    const storageProvider = process.env.CONTEXTNEST_STORAGE_PROVIDER ?? 'vercel';

    if (storageProvider === 'vercel') {
      const prefix = process.env.CONTEXTNEST_BLOB_PREFIX;
      if (!prefix) throw new Error('CONTEXTNEST_BLOB_PREFIX env var is required when CONTEXTNEST_STORAGE_PROVIDER=vercel');
      const resolvedVaultId = vaultId ?? process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
      validateVaultId(resolvedVaultId);
      return new BlobStorageProvider({ prefix, vaultId: resolvedVaultId });
    }

    if (storageProvider === 'azure') {
      const containerName = process.env.AZURE_BLOB_CONTAINER ?? 'skynest';
      const resolvedVaultId = vaultId ?? process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
      validateVaultId(resolvedVaultId);
      return new AzureBlobStorageProvider({ containerName, vaultId: resolvedVaultId });
    }

    throw new Error(`Unknown CONTEXTNEST_STORAGE_PROVIDER value: "${storageProvider}"`);
  }

  if (storage === 'fs') {
    // Each vault can point at its own folder via CONTEXTNEST_VAULT_PATH_<VAULT_ID>.
    const resolvedVaultId = vaultId ?? process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
    validateVaultId(resolvedVaultId);
    const vaultPath = envForVault('CONTEXTNEST_VAULT_PATH', resolvedVaultId);
    if (!vaultPath) throw new Error('CONTEXTNEST_VAULT_PATH env var is required when CONTEXTNEST_STORAGE=fs');
    return new FsStorageProvider(vaultPath);
  }

  throw new Error(`Unknown CONTEXTNEST_STORAGE value: "${storage}"`);
}
