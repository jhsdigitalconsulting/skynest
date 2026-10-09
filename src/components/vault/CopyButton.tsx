'use client';

import { useState } from 'react';
import { Icon } from './Icon';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked; nothing useful to do.
        }
      }}
      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
    >
      <Icon name={copied ? 'check' : 'copy'} className={`h-3.5 w-3.5 ${copied ? 'text-emerald-600' : ''}`} />
    </button>
  );
}
