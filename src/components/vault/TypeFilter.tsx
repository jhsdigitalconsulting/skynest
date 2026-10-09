import Link from 'next/link';
import { vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  vaultId: string;
  types: { type: string; count: number }[];
  active: string | null;
  folder?: string;
  q?: string;
}

/** Chips for narrowing the list by document type; hidden when the vault only has one type. */
export function TypeFilter({ vaultId, types, active, folder, q }: Props) {
  const urls = vaultUrls(vaultId);
  if (types.length < 2) return null;
  const chip = (selected: boolean) =>
    `inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
      selected ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
    }`;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={urls.browse({ folder, q })} className={chip(!active)}>
        All types
      </Link>
      {types.map(({ type, count }) => (
        <Link key={type} href={urls.browse({ folder, q, type })} className={chip(active === type)}>
          {type}
          <span className="opacity-60">{count}</span>
        </Link>
      ))}
    </div>
  );
}
