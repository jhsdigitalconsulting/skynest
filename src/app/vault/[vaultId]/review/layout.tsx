import { listPendingSuggestions } from '@/lib/review';
import { ReviewQueue } from '@/components/vault/ReviewQueue';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { loadDrafts, loadNodes } from '@/lib/vault-ui/data';
import { groupDrafts } from '@/lib/vault-ui/review-queue';

interface Props {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}

/**
 * The review queue stays on the left while the selected draft changes on the right.
 * A layout isn't re-mounted between its child pages, so choosing another item leaves the list as it is.
 */
export default async function ReviewLayout({ children, params }: Props) {
  const { vaultId } = await params;
  const viewer = await requireViewer();
  const [drafts, nodes] = await Promise.all([loadDrafts(vaultId), loadNodes(vaultId)]);
  const published = new Map(nodes.map((n) => [n.id, { version: n.frontmatter.version ?? null }]));
  const groups = groupDrafts(drafts, viewer.login, published);

  let suggestions: Awaited<ReturnType<typeof listPendingSuggestions>> = [];
  if (viewer.isReviewer) {
    try {
      suggestions = await listPendingSuggestions(engineFor(viewer, vaultId).storage);
    } catch (err) {
      console.warn('[vault-ui] could not list suggestions:', (err as Error).message);
    }
  }

  return (
    <ReviewQueue
      groups={groups}
      suggestions={suggestions.map((s) => ({
        suggestion_id: s.suggestion_id,
        document_id: s.document_id,
        title: s.title,
        detected_at: s.detected_at,
      }))}
      canWrite={viewer.access === 'write'}
      isReviewer={viewer.isReviewer}
    >
      {children}
    </ReviewQueue>
  );
}
