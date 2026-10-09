import { redirect } from 'next/navigation';
import { getDefaultVaultId } from '@/lib/vault/registry';
import { vaultUrls } from '@/lib/vault-ui/paths';

export const dynamic = 'force-dynamic';

/** `/vault` opens the deployment's default vault. */
export default function VaultIndex() {
  redirect(vaultUrls(getDefaultVaultId()).root);
}
