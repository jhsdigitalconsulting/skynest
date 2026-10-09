import type { DraftStatus } from '@/lib/review/types';

const DRAFT_STYLES: Record<DraftStatus, { label: string; className: string; dot: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  in_review: { label: 'In review', className: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  changes_requested: {
    label: 'Changes requested',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
  },
};

const DOC_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  draft: 'bg-gray-100 text-gray-600',
};

const PILL = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent';

export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  const s = DRAFT_STYLES[status];
  return (
    <span className={`${PILL} ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function DocStatusBadge({ status, version }: { status: string; version?: number | null }) {
  const label = status === 'published' && version ? `Published · v${version}` : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`${PILL} ${DOC_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-indigo-700">
      {type}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-700">
      New doc
    </span>
  );
}
