import Link from 'next/link';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface TabItem {
  key: string;
  label: string;
  href: string;
  icon?: IconName;
  count?: number;
}

interface Props {
  tabs: TabItem[];
  active: string;
}

/** URL-driven tabs, so every view is linkable and survives a refresh. */
export function Tabs({ tabs, active }: Props) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              scroll={false}
              aria-current={selected ? 'page' : undefined}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-0.5 pb-3 pt-1 text-sm font-medium transition-colors ${
                selected
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {tab.icon && <Icon name={tab.icon} className="h-4 w-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${
                    selected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
