import Link from 'next/link';
import { FOCUS_RING } from './button-styles';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface Props {
  active: 'preview' | 'markdown';
  previewHref: string;
  markdownHref: string;
}

/** URL-driven switch between the rendered document and its raw markdown file. */
export function ContentViewSwitch({ active, previewHref, markdownHref }: Props) {
  const views: { key: Props['active']; label: string; icon: IconName; href: string }[] = [
    { key: 'preview', label: 'Preview', icon: 'eye', href: previewHref },
    { key: 'markdown', label: 'Markdown', icon: 'code', href: markdownHref },
  ];
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5" aria-label="Content view">
      {views.map((v) => (
        <Link
          key={v.key}
          href={v.href}
          scroll={false}
          aria-current={active === v.key ? 'page' : undefined}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${FOCUS_RING} ${
            active === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon name={v.icon} className="h-3.5 w-3.5" />
          {v.label}
        </Link>
      ))}
    </div>
  );
}
