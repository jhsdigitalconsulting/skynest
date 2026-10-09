import Link from 'next/link';
import type { VersionItem } from '@/lib/vault-ui/types';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';
import { RelativeTime } from './RelativeTime';
import { RestoreVersionButton } from './RestoreVersionButton';
import { buttonClass } from './button-styles';
import { EmptyState } from './EmptyState';

interface Props {
  vaultId: string;
  docId: string;
  versions: VersionItem[];
  currentVersion: number | null;
  selected: number | null;
  canWrite: boolean;
  hasDraft: boolean;
}

/** Timeline of published versions with view / compare / restore actions. */
export function VersionHistory({ vaultId, docId, versions, currentVersion, selected, canWrite, hasDraft }: Props) {
  const urls = vaultUrls(vaultId);
  if (!versions.length) {
    return (
      <EmptyState icon="history" title="No published versions yet">
        Versions are recorded each time this document is published.
      </EmptyState>
    );
  }
  return (
    <ol className="relative space-y-1">
      {versions.map((v, i) => {
        const isCurrent = v.version === currentVersion;
        const isSelected = v.version === selected;
        return (
          <li
            key={v.version}
            className={`relative flex gap-4 rounded-xl px-3 py-3 ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-white'}`}
          >
            <div className="relative flex flex-col items-center">
              <span
                className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  isCurrent ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-300'
                }`}
              >
                v{v.version}
              </span>
              {i < versions.length - 1 && <span className="absolute top-8 h-[calc(100%+0.25rem)] w-px bg-gray-200" />}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium text-gray-900">{v.editedBy}</span>
                <span className="text-gray-400">·</span>
                <RelativeTime iso={v.editedAt} className="text-gray-500" />
                {isCurrent && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>
                )}
              </div>
              {v.note && <p className="mt-1 text-sm text-gray-600">{v.note}</p>}
            </div>
            <div className="flex shrink-0 items-start gap-1.5">
              <Link href={urls.doc(docId, { tab: 'history', version: v.version })} scroll={false} className={buttonClass('ghost', 'sm')}>
                <Icon name="eye" className="h-3.5 w-3.5" />
                View
              </Link>
              {!isCurrent && canWrite && <RestoreVersionButton docId={docId} version={v.version} hasDraft={hasDraft} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
