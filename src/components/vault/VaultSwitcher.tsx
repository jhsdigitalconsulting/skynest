'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';

interface VaultOption {
  id: string;
  label: string;
}

interface Props {
  vaults: VaultOption[];
  currentId: string;
}

const SWATCHES = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-amber-500',
  'bg-rose-600',
  'bg-violet-600',
  'bg-teal-600',
];

/** A stable color per vault id, so each vault is recognisable at a glance. */
function swatchFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SWATCHES[hash % SWATCHES.length];
}

function VaultMark({ vault }: { vault: VaultOption }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white ${swatchFor(vault.id)}`}
    >
      {vault.label.charAt(0).toUpperCase()}
    </span>
  );
}

/** Shows which vault is open and, when there's more than one, switches between them. */
export function VaultSwitcher({ vaults, currentId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = vaults.find((v) => v.id === currentId) ?? { id: currentId, label: currentId };
  const canSwitch = vaults.length > 1;

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

  const label = (
    <>
      <VaultMark vault={current} />
      <span className="max-w-48 truncate text-sm font-semibold text-gray-900">{current.label}</span>
    </>
  );

  if (!canSwitch) {
    return <div className="flex min-w-0 items-center gap-2 px-1">{label}</div>;
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Vault: ${current.label}. Switch vault`}
        className="flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 hover:bg-gray-100"
      >
        {label}
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 z-40 mt-2 w-64 rounded-xl bg-white p-1.5 text-sm shadow-lg ring-1 ring-gray-200">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Vaults</p>
          <ul role="listbox" aria-label="Vaults">
            {vaults.map((vault) => {
              const selected = vault.id === current.id;
              return (
                <li key={vault.id} role="option" aria-selected={selected}>
                  <Link
                    href={vaultUrls(vault.id).browse()}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                  >
                    <VaultMark vault={vault} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">{vault.label}</span>
                      <span className="block truncate font-mono text-xs text-gray-400">{vault.id}</span>
                    </span>
                    {selected && <Icon name="check" className="h-4 w-4 shrink-0 text-indigo-600" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
