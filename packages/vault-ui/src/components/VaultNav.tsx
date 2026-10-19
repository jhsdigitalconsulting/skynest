'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FOCUS_RING } from './button-styles';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useVaultUrls } from './useVault';

interface Props {
  reviewCount: number;
  myDraftCount: number;
  /** Reviewers get a link to the vault's CONTEXT.md editor. */
  canEditContext: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  highlight?: boolean;
}

export function VaultNav({ reviewCount, myDraftCount, canEditContext }: Props) {
  const urls = useVaultUrls();
  const pathname = usePathname();
  const params = useSearchParams();
  // On a draft, `tab` is the preview/changes view and `list` is the queue tab.
  const tab = params.get('list') ?? params.get('tab');
  const inReview = pathname.startsWith(`${urls.root}/review`);

  const items: NavItem[] = [
    {
      href: urls.browse(),
      label: 'Browse',
      icon: 'layers',
      active: pathname === urls.root || pathname.startsWith(`${urls.root}/doc`),
    },
    {
      href: urls.review(),
      label: 'Review queue',
      icon: 'inbox',
      count: reviewCount,
      highlight: true,
      active: inReview && tab !== 'mine',
    },
    {
      href: urls.review('mine'),
      label: 'My drafts',
      icon: 'draft',
      count: myDraftCount,
      active: (inReview && tab === 'mine') || pathname.startsWith(`${urls.root}/edit`),
    },
    ...(canEditContext
      ? [
          {
            href: urls.context,
            label: 'Instructions',
            icon: 'file' as const,
            active: pathname === urls.context,
          },
        ]
      : []),
  ];

  return (
    <nav className="flex shrink-0 items-center gap-1" aria-label="Vault">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          title={item.label}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${FOCUS_RING} ${
            item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Icon name={item.icon} className="h-4 w-4" />
          <span className="sr-only md:not-sr-only">{item.label}</span>
          {item.count ? (
            <span
              className={`min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold ${
                item.highlight ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
