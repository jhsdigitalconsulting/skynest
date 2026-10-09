import { redirect } from 'next/navigation';
import { Editor } from '@/components/vault/Editor';
import { requireViewer } from '@/lib/vault-ui/context';
import { loadLinkIndex } from '@/lib/vault-ui/data';
import { loadFolders } from '@/lib/vault-ui/editor-data';
import { vaultUrls } from '@/lib/vault-ui/paths';

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
  const [folders, linkIndex] = await Promise.all([loadFolders(vaultId), loadLinkIndex(vaultId)]);

  return (
    <Editor
      docId={null}
      isNew
      initial={{ title: '', description: '', tags: [], type: 'document', body: '' }}
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
