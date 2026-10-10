import Link from 'next/link';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';

interface Props {
  vaultId: string;
  docId: string;
  /** Optional trailing crumb (e.g. "Edit", "Review"). */
  trail?: { label: string; href?: string }[];
}

/** Vault › folder › subfolder › doc — each folder links back to the browse view. */
export function DocBreadcrumbs({ vaultId, docId, trail = [] }: Props) {
  const urls = vaultUrls(vaultId);
  const parts = docId.split('/');
  const name = parts.pop() ?? docId;
  const crumbs = [
    { label: 'Vault', href: urls.browse() },
    ...parts.map((part, i) => ({ label: part, href: urls.browse({ folder: parts.slice(0, i + 1).join('/') }) })),
    { label: name, href: trail.length ? urls.doc(docId) : undefined },
    ...trail,
  ];
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <Icon name="chevronRight" className="h-3.5 w-3.5 text-gray-300" />}
          {c.href ? (
            <Link href={c.href} className="hover:text-gray-900">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-700">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
