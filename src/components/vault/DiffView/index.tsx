'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DocSnapshot } from '@/lib/vault-ui/types';
import { Icon } from '../Icon';
import { collapse, computeDiff } from './compute';
import type { DiffRow } from './compute';
import { MetaChanges } from './MetaChanges';
import { SplitDiff } from './SplitDiff';
import { UnifiedDiff } from './UnifiedDiff';

export interface DiffViewProps {
  before: DocSnapshot | null;
  after: DocSnapshot;
  beforeLabel: string;
  afterLabel: string;
}

type Mode = 'unified' | 'split';
const MODE_KEY = 'skynest.diffMode';

export function DiffView({ before, after, beforeLabel, afterLabel }: DiffViewProps) {
  const [mode, setMode] = useState<Mode>('unified');
  const { lines, stats } = useMemo(() => computeDiff(before?.body ?? '', after.body), [before, after]);
  const [rows, setRows] = useState<DiffRow[]>(() => collapse(lines));

  useEffect(() => setRows(collapse(lines)), [lines]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === 'split' || saved === 'unified') setMode(saved);
    } catch {
      // Storage unavailable (private mode); keep the default.
    }
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {
      // ignore
    }
  };

  const expand = (index: number) =>
    setRows((current) => {
      const row = current[index];
      if (row?.kind !== 'gap') return current;
      return [...current.slice(0, index), ...row.lines, ...current.slice(index + 1)];
    });

  const bodyChanged = stats.added > 0 || stats.removed > 0;
  const toggle = (m: Mode, icon: 'rows' | 'columns', label: string) => (
    <button
      type="button"
      onClick={() => choose(m)}
      aria-pressed={mode === m}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${
        mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600">
          <span className="truncate">{beforeLabel}</span>
          <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate font-medium text-gray-900">{afterLabel}</span>
          <span className="ml-2 font-mono font-medium text-emerald-600">+{stats.added}</span>
          <span className="font-mono font-medium text-rose-600">−{stats.removed}</span>
        </div>
        <div className="flex rounded-lg bg-gray-200/70 p-0.5">
          {toggle('unified', 'rows', 'Unified')}
          {toggle('split', 'columns', 'Split')}
        </div>
      </div>
      <MetaChanges before={before} after={after} />
      {bodyChanged ? (
        <div className="overflow-x-auto">
          {mode === 'unified' ? <UnifiedDiff rows={rows} onExpand={expand} /> : <SplitDiff rows={rows} onExpand={expand} />}
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-gray-500">The body text is unchanged.</p>
      )}
    </div>
  );
}
