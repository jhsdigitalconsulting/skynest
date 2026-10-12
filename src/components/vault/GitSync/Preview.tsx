import type { PlanSummary } from '@/lib/vault/sync/git-pull';

interface Props {
  summary: PlanSummary;
  prune: boolean;
  onPruneChange: (prune: boolean) => void;
}

function Row({ label, count, paths, tone }: { label: string; count: number; paths: string[]; tone: string }) {
  if (count === 0) return null;
  return (
    <li className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{count}</span>
      </div>
      <ul className="mt-1 max-h-24 overflow-auto font-mono text-xs text-gray-500">
        {paths.map((p) => (
          <li key={p} className="truncate">{p}</li>
        ))}
        {count > paths.length && <li>…and {count - paths.length} more</li>}
      </ul>
    </li>
  );
}

export function Preview({ summary, prune, onPruneChange }: Props) {
  const { counts, paths } = summary;
  const deletions = counts.remove + counts.removeConflict;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Pulling <span className="font-mono">{summary.repo}</span>@<span className="font-mono">{summary.branch}</span>.
        Git wins: where a file differs, the vault copy is replaced and the old one is saved under <span className="font-mono">_sync/backup</span> first.
      </p>
      {!summary.hasBase && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          First sync for this vault: every file that differs from Git counts as a conflict, because there is no earlier sync to compare against. Nothing is lost; each replaced copy is backed up.
        </p>
      )}
      {!summary.hasChanges && deletions === 0 ? (
        <p className="text-sm text-gray-500">The vault already matches Git.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          <Row label="New from Git" count={counts.add} paths={paths.add} tone="bg-emerald-50 text-emerald-700" />
          <Row label="Updated in Git" count={counts.update} paths={paths.update} tone="bg-indigo-50 text-indigo-700" />
          <Row label="Changed in both (Git wins, vault copy backed up)" count={counts.conflict} paths={paths.conflict} tone="bg-amber-50 text-amber-700" />
          <Row label={summary.hasBase ? 'Removed from Git' : 'Only in the vault'} count={counts.remove} paths={paths.remove} tone="bg-gray-100 text-gray-700" />
          <Row label="Removed from Git but edited in the vault" count={counts.removeConflict} paths={paths.removeConflict} tone="bg-amber-50 text-amber-700" />
        </ul>
      )}
      {deletions > 0 && (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5" checked={prune} onChange={(e) => onPruneChange(e.target.checked)} />
          <span>Also delete the {deletions} file{deletions === 1 ? '' : 's'} Git no longer has (backed up first). Off by default.</span>
        </label>
      )}
      <p className="text-xs text-gray-400">Documents created only in the vault and all drafts are never touched.</p>
    </div>
  );
}
