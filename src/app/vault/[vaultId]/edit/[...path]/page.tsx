import { notFound, redirect } from 'next/navigation';
import { getDraft, readDocumentOrNull } from '@/lib/review';
import { Editor } from '@/components/vault/Editor';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { parseSnapshot, snapshotOf } from '@/lib/vault-ui/doc-data';
import { draftLockReason, loadFolders } from '@/lib/vault-ui/editor-data';
import { decodeSegments, vaultUrls } from '@/lib/vault-ui/paths';
import { folderOf, loadLinkIndex } from '@/lib/vault-ui/data';

interface Props {
  params: Promise<{ vaultId: string; path: string[] }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  return { title: `Edit · ${decodeSegments(path)}` };
}

export default async function EditPage({ params }: Props) {
  const { vaultId, path } = await params;
  const urls = vaultUrls(vaultId);
  const docId = decodeSegments(path);
  const viewer = await requireViewer();
  if (viewer.access !== 'write') redirect(urls.doc(docId));
  const { storage } = engineFor(viewer, vaultId);

  const [draft, node, folders, linkIndex] = await Promise.all([
    getDraft(storage, docId),
    readDocumentOrNull(storage, docId),
    loadFolders(vaultId),
    loadLinkIndex(vaultId),
  ]);
  if (!draft && !node) notFound();

  const snapshot = draft ? parseSnapshot(docId, draft.content) : snapshotOf(node!);

  return (
    <Editor
      key={docId}
      docId={docId}
      isNew={draft?.isNew ?? false}
      initial={snapshot}
      revision={draft?.revision ?? null}
      status={draft?.status ?? null}
      isReviewer={viewer.isReviewer}
      defaultFolder={folderOf(docId)}
      folders={folders}
      lockedReason={draftLockReason(draft, viewer)}
      linkIndex={linkIndex}
    />
  );
}
