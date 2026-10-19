import { redirect } from 'next/navigation';
import { Editor } from '@/components/vault/Editor';
import { requireViewer } from '@/lib/vault-ui/context';
import { loadLinkIndex, loadNodes } from '@/lib/vault-ui/data';
import { loadFolders } from '@/lib/vault-ui/editor-data';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { loadVaultConfig } from '@/lib/vault-ui/vault-config';

interface Props {
  params: Promise<{ vaultId: string }>;
  searchParams: Promise<{ folder?: string }>;
}

export const metadata = { title: 'New document' };

export default async function NewDocPage({ params, searchParams }: Props) {
  const { vaultId } = await params;
  const urls = vaultUrls(vaultId);
  const { folder } = await searchParams;
  const viewer = await requireViewer();
  if (viewer.access !== 'write') redirect(urls.browse());
  const [folders, linkIndex, config, nodes] = await Promise.all([
    loadFolders(vaultId),
    loadLinkIndex(vaultId),
    loadVaultConfig(vaultId),
    loadNodes(vaultId),
  ]);
  // A folder's template (Settings → Folders) is a document whose body new documents there start from.
  const templateId = folder ? config?.folders?.[folder]?.template : undefined;
  const template = templateId ? nodes.find((n) => n.id === templateId) : undefined;

  return (
    <Editor
      docId={null}
      isNew
      initial={{ title: '', description: '', tags: [], type: template?.frontmatter.type ?? 'document', body: template?.body ?? '' }}
      revision={null}
      status={null}
      isReviewer={viewer.isReviewer}
      defaultFolder={folder ?? ''}
      folders={folders}
      lockedReason={null}
      linkIndex={linkIndex}
    />
  );
}
