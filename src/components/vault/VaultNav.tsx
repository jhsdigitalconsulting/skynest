'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useVaultUrls } from './useVault';

interface Props {
  reviewCount: number;
  myDraftCount: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  active: boolean;
  highlight?: boolean;
}

export function VaultNav({ reviewCount, myDraftCount }: Props) {
  const urls = useVaultUrls();
  const pathname = usePathname();
  const tab = useSearchParams().get('tab');
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
  ];

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
            item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Icon name={item.icon} className="h-4 w-4" />
          <span className="hidden md:inline">{item.label}</span>
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
