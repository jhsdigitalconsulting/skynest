'use client';

import { Icon } from '../../../Icon';
import { HEADINGS } from './actions';

interface Props {
  /** The current heading level, or 0 for body text. */
  level: number;
  disabled: boolean;
  onChange: (level: number) => void;
}

/** Body text / Heading 1–6, as one compact dropdown. */
export function HeadingSelect({ level, disabled, onChange }: Props) {
  return (
    <div className="relative">
      <select
        value={level}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Text style"
        title="Text style"
        className="h-8 appearance-none rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-2 focus:outline-indigo-500 disabled:opacity-40"
      >
        <option value={0}>Body text</option>
        {HEADINGS.map((h) => (
          <option key={h} value={h}>
            Heading {h}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
