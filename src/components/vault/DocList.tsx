import Link from 'next/link';
import type { DocListItem } from '@/lib/vault-ui/types';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';
import { RelativeTime } from './RelativeTime';
import { DocStatusBadge, DraftStatusBadge, TypeBadge } from './StatusBadge';

interface Props {
  vaultId: string;
  items: DocListItem[];
  /** Hide the folder prefix when every row is in the folder being shown. */
  folder?: string;
}

export function DocList({ vaultId, items, folder }: Props) {
  const urls = vaultUrls(vaultId);
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      {items.map((item) => {
        const relative = folder && item.id.startsWith(`${folder}/`) ? item.id.slice(folder.length + 1) : item.id;
        return (
          <li key={item.id}>
            <Link
              href={urls.doc(item.id)}
              className="group flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-5"
            >
              <Icon name="file" className="mt-0.5 h-5 w-5 shrink-0 text-gray-400 group-hover:text-indigo-500" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate font-medium text-gray-900 group-hover:text-indigo-700">{item.title}</span>
                  {item.type !== 'document' && <TypeBadge type={item.type} />}
                  {item.draftStatus && <DraftStatusBadge status={item.draftStatus} />}
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-gray-400">{relative}</p>
                {(item.excerpt || item.description) && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{item.excerpt ?? item.description}</p>
                )}
                {item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.slice(0, 6).map((tag) => (
                      <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1.5 text-xs text-gray-500 sm:flex">
                <DocStatusBadge status={item.status} version={item.version} />
                <RelativeTime iso={item.updatedAt} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
