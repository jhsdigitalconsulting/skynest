'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FolderNode } from '@/lib/vault-ui/types';
import { Icon } from './Icon';
import { useVaultUrls } from './useVault';

interface Props {
  root: FolderNode;
  activeFolder: string;
}

function isAncestor(path: string, active: string): boolean {
  return active === path || active.startsWith(`${path}/`);
}

function FolderRow({ node, depth, activeFolder }: { node: FolderNode; depth: number; activeFolder: string }) {
  const urls = useVaultUrls();
  const [open, setOpen] = useState(() => isAncestor(node.path, activeFolder) || depth === 0);
  const active = activeFolder === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={`group flex items-center rounded-md text-sm ${
          active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-7 w-6 shrink-0 items-center justify-center text-gray-400 ${hasChildren ? '' : 'invisible'}`}
          aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-3.5 w-3.5" />
        </button>
        <Link href={urls.browse({ folder: node.path })} className="flex min-w-0 flex-1 items-center gap-2 py-1 pr-2">
          <Icon name="folder" className={`h-4 w-4 shrink-0 ${active ? 'text-indigo-500' : 'text-gray-400'}`} />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-xs tabular-nums text-gray-400">{node.count}</span>
        </Link>
      </div>
      {open && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <FolderRow key={child.path} node={child} depth={depth + 1} activeFolder={activeFolder} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({ root, activeFolder }: Props) {
  const urls = useVaultUrls();
  const allActive = activeFolder === '';
  return (
    <nav aria-label="Folders">
      <Link
        href={urls.browse()}
        className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium ${
          allActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon name="layers" className="h-4 w-4" />
        All documents
        <span className="ml-auto text-xs tabular-nums text-gray-400">{root.count}</span>
      </Link>
      <ul>
        {root.children.map((child) => (
          <FolderRow key={child.path} node={child} depth={0} activeFolder={activeFolder} />
        ))}
      </ul>
    </nav>
  );
}
