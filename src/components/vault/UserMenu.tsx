'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';

interface Props {
  viewer: {
    login: string;
    name: string | null;
    image: string | null;
    access: 'read' | 'write';
    isReviewer: boolean;
  };
}

export function UserMenu({ viewer }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const role = viewer.isReviewer ? 'Reviewer' : viewer.access === 'write' ? 'Editor' : 'Read-only';
  const initial = (viewer.name ?? viewer.login).charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 ring-2 ring-white hover:ring-indigo-200"
      >
        {viewer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewer.image} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white p-1.5 text-sm shadow-lg ring-1 ring-gray-200">
          <div className="px-3 py-2">
            <p className="truncate font-medium text-gray-900">{viewer.name ?? viewer.login}</p>
            <p className="truncate text-xs text-gray-500">{viewer.login}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              <Icon name={viewer.isReviewer ? 'check' : viewer.access === 'write' ? 'edit' : 'eye'} className="h-3 w-3" />
              {role}
            </span>
          </div>
          <div className="my-1 border-t border-gray-100" />
          <Link href="/" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
            Skynest home
          </Link>
          <Link href="/docs" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
            Connect an MCP client
          </Link>
          <Link href="/admin" className="block rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">
            Admin
          </Link>
        </div>
      )}
    </div>
  );
}
