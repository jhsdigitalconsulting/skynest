import { redirect } from 'next/navigation';
import { getVaultHost } from '@/lib/vault-ui/current-host';
import { vaultUrls } from '@/lib/vault-ui/paths';

export const dynamic = 'force-dynamic';

/** `/vault` opens the deployment's default vault. */
export default function VaultIndex() {
  redirect(vaultUrls(getVaultHost().vaults.defaultId()).root);
}
