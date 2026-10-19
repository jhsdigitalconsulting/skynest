'use client';

import Link from 'next/link';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { Icon } from './Icon';
import { FOCUS_RING } from './button-styles';
import { usePopoverMenu } from './usePopoverMenu';

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
  const menu = usePopoverMenu();
  const current = vaults.find((v) => v.id === currentId) ?? { id: currentId, label: currentId };
  const canSwitch = vaults.length > 1;

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
    <div ref={menu.rootRef} className="relative min-w-0">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={menu.toggle}
        onKeyDown={menu.onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Vault: ${current.label}. Switch vault`}
        className={`flex h-9 min-w-0 items-center gap-2 rounded-lg px-2 hover:bg-gray-100 ${FOCUS_RING}`}
      >
        {label}
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-gray-500" />
      </button>
      {menu.open && (
        <div
          ref={menu.menuRef}
          role="menu"
          aria-label="Vaults"
          onKeyDown={menu.onMenuKeyDown}
          className="absolute left-0 z-40 mt-2 w-64 rounded-xl bg-white p-1.5 text-sm shadow-lg ring-1 ring-gray-200"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500" aria-hidden>
            Vaults
          </p>
          {vaults.map((vault) => {
            const selected = vault.id === current.id;
            return (
              <Link
                key={vault.id}
                href={vaultUrls(vault.id).browse()}
                role="menuitem"
                data-menu-item
                aria-current={selected ? 'true' : undefined}
                onClick={menu.close}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-50 focus-visible:bg-gray-50 ${FOCUS_RING} ${selected ? 'bg-gray-50' : ''}`}
              >
                <VaultMark vault={vault} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{vault.label}</span>
                  <span className="block truncate font-mono text-xs text-gray-500">{vault.id}</span>
                </span>
                {selected && <Icon name="check" className="h-4 w-4 shrink-0 text-indigo-600" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
