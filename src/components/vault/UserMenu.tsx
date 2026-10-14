'use client';

import Link from 'next/link';
import { Icon } from './Icon';
import { FOCUS_RING } from './button-styles';
import { usePopoverMenu } from './usePopoverMenu';

interface Props {
  viewer: {
    login: string;
    name: string | null;
    image: string | null;
    access: 'read' | 'write';
    isReviewer: boolean;
  };
}

const ITEM = `block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none ${FOCUS_RING}`;

export function UserMenu({ viewer }: Props) {
  const menu = usePopoverMenu();
  const role = viewer.isReviewer ? 'Reviewer' : viewer.access === 'write' ? 'Editor' : 'Read-only';
  const initial = (viewer.name ?? viewer.login).charAt(0).toUpperCase();

  return (
    <div ref={menu.rootRef} className="relative shrink-0">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        onKeyDown={menu.onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Account: ${viewer.name ?? viewer.login}`}
        className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 ring-2 ring-white hover:ring-indigo-200 ${FOCUS_RING}`}
      >
        {viewer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewer.image} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {menu.open && (
        <div
          ref={menu.menuRef}
          role="menu"
          aria-label="Account"
          onKeyDown={menu.onMenuKeyDown}
          className="absolute right-0 z-40 mt-2 w-60 rounded-xl bg-white p-1.5 text-sm shadow-lg ring-1 ring-gray-200"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium text-gray-900">{viewer.name ?? viewer.login}</p>
            <p className="truncate text-xs text-gray-500">{viewer.login}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              <Icon name={viewer.isReviewer ? 'check' : viewer.access === 'write' ? 'edit' : 'eye'} className="h-3 w-3" />
              {role}
            </span>
          </div>
          <div className="my-1 border-t border-gray-100" role="separator" />
          <Link href="/" role="menuitem" data-menu-item onClick={menu.close} className={ITEM}>
            Skynest home
          </Link>
          <Link href="/docs" role="menuitem" data-menu-item onClick={menu.close} className={ITEM}>
            Connect an MCP client
          </Link>
          {/* Admin is reviewer-only; other roles would only hit a dead end. */}
          {viewer.isReviewer && (
            <Link href="/admin" role="menuitem" data-menu-item onClick={menu.close} className={ITEM}>
              Admin
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
