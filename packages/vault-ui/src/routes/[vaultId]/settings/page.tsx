import yaml from 'js-yaml';
import { redirect } from 'next/navigation';
import { VaultSettings } from '../../../components/VaultSettings';
import { PAGE_CONTAINER } from '../../../components/layout-styles';
import { requireViewer } from '../../../lib/context';
import { loadLinkIndex } from '../../../lib/data';
import { loadFolders } from '../../../lib/editor-data';
import { vaultUrls } from '../../../lib/paths';
import { loadVaultConfig } from '../../../lib/vault-config';
import { settingsFromConfig } from '../../../lib/vault-settings';
import { getVaultHost } from '../../../lib/current-host';

interface Props {
  params: Promise<{ vaultId: string }>;
}

export const metadata = { title: 'Vault settings' };

// Keys the form edits; everything else in config.yaml is shown read-only.
const EDITED = new Set(['name', 'description', 'folders', 'agent_tools', 'agent_maintenance_directive']);

export default async function SettingsPage({ params }: Props) {
  const vaultId = decodeURIComponent((await params).vaultId);
  const viewer = await requireViewer();
  if (!viewer.isReviewer) redirect(vaultUrls(vaultId).browse());
  const [config, folders, linkIndex] = await Promise.all([
    loadVaultConfig(vaultId),
    loadFolders(vaultId),
    loadLinkIndex(vaultId),
  ]);
  const other = Object.fromEntries(Object.entries(config ?? {}).filter(([key]) => !EDITED.has(key)));
  const otherYaml = Object.keys(other).length ? yaml.dump(other, { lineWidth: -1, noRefs: true }).trimEnd() : '';

  return (
    <div className={`${PAGE_CONTAINER} max-w-4xl py-6`}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Vault settings</h1>
      <p className="mt-1.5 text-gray-600">
        Stored in the vault&rsquo;s <code className="rounded bg-gray-100 px-1 text-sm">.context/config.yaml</code>.
        Saving commits the file and takes effect straight away — it doesn&rsquo;t go through review.
      </p>
      <div className="mt-5">
        <VaultSettings
          initial={settingsFromConfig(config, folders)}
          fallbackName={getVaultHost().vaults.find(vaultId)?.label ?? vaultId}
          docs={linkIndex.docs}
          otherYaml={otherYaml}
        />
      </div>
    </div>
  );
}
