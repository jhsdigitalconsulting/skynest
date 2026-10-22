'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FolderNode } from '../lib/types';
import { useFolderActions } from './FolderActions';
import { Icon } from './Icon';
import { FOCUS_RING } from './button-styles';
import { useVaultUrls } from './useVault';

interface Props {
  root: FolderNode;
  activeFolder: string;
  /** Writers get a right-click menu for creating documents and folders. */
  canWrite: boolean;
}

function isAncestor(path: string, active: string): boolean {
  return active === path || active.startsWith(`${path}/`);
}

function FolderRow({ node, depth, activeFolder, canWrite }: { node: FolderNode; depth: number; activeFolder: string; canWrite: boolean }) {
  const urls = useVaultUrls();
  const { openMenu } = useFolderActions();
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
        onContextMenu={
          canWrite
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                openMenu({ x: e.clientX, y: e.clientY, folder: node.path });
              }
            : undefined
        }
        onKeyDown={
          canWrite
            ? (e) => {
                if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                openMenu({ x: r.left + 24, y: r.bottom, folder: node.path });
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-7 w-6 shrink-0 items-center justify-center rounded text-gray-500 ${FOCUS_RING} ${hasChildren ? '' : 'invisible'}`}
          aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-3.5 w-3.5" />
        </button>
        <Link href={urls.browse({ folder: node.path })} className={`flex min-w-0 flex-1 items-center gap-2 rounded py-1 pr-2 ${FOCUS_RING}`}>
          <Icon name="folder" className={`h-4 w-4 shrink-0 ${active ? 'text-indigo-500' : 'text-gray-400'}`} />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-xs tabular-nums text-gray-500">{node.count}</span>
        </Link>
      </div>
      {open && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <FolderRow key={child.path} node={child} depth={depth + 1} activeFolder={activeFolder} canWrite={canWrite} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({ root, activeFolder, canWrite }: Props) {
  const urls = useVaultUrls();
  const { openMenu, rootPath } = useFolderActions();
  const allActive = activeFolder === '';
  return (
    <nav
      aria-label="Folders"
      className="min-h-24"
      onContextMenu={
        canWrite
          ? (e) => {
              e.preventDefault();
              openMenu({ x: e.clientX, y: e.clientY, folder: rootPath });
            }
          : undefined
      }
    >
      <Link
        href={urls.browse()}
        className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium ${FOCUS_RING} ${
          allActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon name="layers" className="h-4 w-4" />
        All documents
        <span className="ml-auto text-xs tabular-nums text-gray-500">{root.count}</span>
      </Link>
      <ul>
        {root.children.map((child) => (
          <FolderRow key={child.path} node={child} depth={0} activeFolder={activeFolder} canWrite={canWrite} />
        ))}
      </ul>
    </nav>
  );
}
