'use client';

import { Icon } from '../Icon';
import { FOCUS_RING } from '../button-styles';
import { usePopoverMenu } from '../usePopoverMenu';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/** A dropdown of checkboxes for picking any number of values, e.g. tags or authors. */
export function FilterMenu({ label, options, selected, onChange }: Props) {
  const { open, toggle, rootRef, triggerRef, menuRef, onMenuKeyDown, onTriggerKeyDown } = usePopoverMenu();
  const on = new Set(selected.map((s) => s.toLowerCase()));
  const flip = (value: string) =>
    onChange(on.has(value.toLowerCase()) ? selected.filter((s) => s.toLowerCase() !== value.toLowerCase()) : [...selected, value]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={!options.length}
        className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium ring-1 ring-inset disabled:opacity-40 ${FOCUS_RING} ${
          selected.length ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
        }`}
      >
        {label}
        {selected.length > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] text-white">{selected.length}</span>}
        <Icon name="chevronDown" className="h-3 w-3" />
      </button>
      {open && (
        <div
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
          role="group"
          aria-label={label}
          className="absolute left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200"
        >
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
              <input
                type="checkbox"
                data-menu-item
                checked={on.has(option.toLowerCase())}
                onChange={() => flip(option)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="min-w-0 truncate">{option}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <button
              type="button"
              data-menu-item
              onClick={() => onChange([])}
              className="mt-1 w-full border-t border-gray-100 px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
