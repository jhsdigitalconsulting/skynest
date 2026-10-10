import Link from 'next/link';
import { listPendingSuggestions } from '@/lib/review';
import type { DraftSummary } from '@/lib/review';
import { DraftCard } from '@/components/vault/DraftCard';
import { EmptyState } from '@/components/vault/EmptyState';
import { Icon } from '@/components/vault/Icon';
import { RelativeTime } from '@/components/vault/RelativeTime';
import { Tabs } from '@/components/vault/Tabs';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { loadDrafts, loadNodes } from '@/lib/vault-ui/data';
import { vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  params: Promise<{ vaultId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const metadata = { title: 'Review queue' };

type TabKey = 'review' | 'changes' | 'drafts' | 'mine';

const EMPTY: Record<TabKey, { icon: 'inbox' | 'undo' | 'draft'; title: string; body: string }> = {
  review: {
    icon: 'inbox',
    title: 'Nothing waiting for review',
    body: 'When someone — or an agent — submits changes, they’ll show up here for approval.',
  },
  changes: {
    icon: 'undo',
    title: 'No drafts sent back',
    body: 'Drafts a reviewer has asked to revise appear here until they’re resubmitted.',
  },
  drafts: {
    icon: 'draft',
    title: 'No drafts in progress',
    body: 'Drafts that are still being written, and haven’t been submitted yet, appear here.',
  },
  mine: {
    icon: 'draft',
    title: 'You don’t have any drafts',
    body: 'Open any document and choose Edit, or start a new one. Your work in progress will be listed here.',
  },
};

function involves(draft: DraftSummary, login: string): boolean {
  const l = login.toLowerCase();
  return draft.author.toLowerCase() === l || draft.contributors.some((c) => c.toLowerCase() === l);
}

export default async function ReviewQueuePage({ params, searchParams }: Props) {
  const { vaultId } = await params;
  const urls = vaultUrls(vaultId);
  const { tab } = await searchParams;
  const viewer = await requireViewer();
  const [drafts, nodes] = await Promise.all([loadDrafts(vaultId), loadNodes(vaultId)]);
  const liveVersions = new Map(nodes.map((n) => [n.id, n.frontmatter.version ?? null]));

  const byRecent = (a: DraftSummary, b: DraftSummary) =>
    (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt);
  // Oldest submission first: the queue is first-come, first-served.
  const groups: Record<TabKey, DraftSummary[]> = {
    review: drafts
      .filter((d) => d.status === 'in_review')
      .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '')),
    changes: drafts.filter((d) => d.status === 'changes_requested').sort(byRecent),
    drafts: drafts.filter((d) => d.status === 'draft').sort(byRecent),
    mine: drafts.filter((d) => involves(d, viewer.login)).sort(byRecent),
  };
  const active: TabKey = tab && tab in groups ? (tab as TabKey) : 'review';
  const list = groups[active];

  let suggestions: Awaited<ReturnType<typeof listPendingSuggestions>> = [];
  if (active === 'review' && viewer.isReviewer) {
    try {
      suggestions = await listPendingSuggestions(engineFor(viewer, vaultId).storage);
    } catch (err) {
      console.warn('[vault-ui] could not list suggestions:', (err as Error).message);
    }
  }

  const intro =
    active === 'review'
      ? viewer.isReviewer
        ? 'Changes waiting on your approval, oldest first.'
        : 'Changes waiting on a reviewer. Only reviewers can approve them, but anyone can comment.'
      : active === 'mine'
        ? 'Drafts you started or contributed to.'
        : active === 'changes'
          ? 'Drafts a reviewer has sent back for revision.'
          : 'Drafts that haven’t been submitted for review yet.';

  return (
    <div className={`${PAGE_CONTAINER} py-6`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {active === 'mine' ? 'My drafts' : 'Review queue'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{intro}</p>
        </div>
        {viewer.access === 'write' && (
          <Link href={urls.newDoc()} className={buttonClass('secondary')}>
            <Icon name="plus" />
            New document
          </Link>
        )}
      </div>

      <div className="mt-6">
        <Tabs
          active={active}
          tabs={[
            { key: 'review', label: 'Needs review', icon: 'inbox', href: urls.review(), count: groups.review.length },
            { key: 'changes', label: 'Changes requested', icon: 'undo', href: urls.review('changes'), count: groups.changes.length },
            { key: 'drafts', label: 'In progress', icon: 'draft', href: urls.review('drafts'), count: groups.drafts.length },
            { key: 'mine', label: 'Mine', icon: 'user', href: urls.review('mine'), count: groups.mine.length },
          ]}
        />
      </div>

      <div className="mt-6">
        {list.length ? (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            {list.map((d) => (
              <DraftCard vaultId={vaultId} key={d.docId} draft={d} liveVersion={liveVersions.get(d.docId) ?? null} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={EMPTY[active].icon}
            title={EMPTY[active].title}
            action={
              active === 'mine' && viewer.access === 'write' ? (
                <Link href={urls.newDoc()} className={buttonClass('primary')}>
                  <Icon name="plus" />
                  New document
                </Link>
              ) : undefined
            }
          >
            {EMPTY[active].body}
          </EmptyState>
        )}
      </div>

      {suggestions.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Icon name="spark" className="h-4 w-4 text-indigo-500" />
            Drift suggestions
            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-semibold text-gray-600">{suggestions.length}</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Proposed by source-drift detection. Review and apply them with the MCP <code className="text-xs">list_suggestions</code> and <code className="text-xs">approve_suggestion</code> tools.
          </p>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            {suggestions.map((s) => (
              <li key={s.suggestion_id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <Icon name="spark" className="h-4 w-4 shrink-0 text-gray-400" />
                <Link href={urls.doc(s.document_id)} className="min-w-0 flex-1 truncate text-gray-800 hover:text-indigo-700">
                  {s.title ?? s.document_id}
                </Link>
                <RelativeTime iso={s.detected_at} className="shrink-0 text-xs text-gray-400" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
