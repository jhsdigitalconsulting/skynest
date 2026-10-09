import type { DiffLine } from './compute';

/** One line's text, with word-level highlights when available. */
export function LineText({ line }: { line: DiffLine }) {
  if (!line.segments) return <>{line.text || ' '}</>;
  const mark = line.kind === 'add' ? 'bg-emerald-200/80' : 'bg-rose-200/80';
  return (
    <>
      {line.segments.map((s, i) =>
        s.changed ? (
          <mark key={i} className={`${mark} rounded-sm text-inherit`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export const ROW_BG: Record<DiffLine['kind'], string> = {
  add: 'bg-emerald-50',
  del: 'bg-rose-50',
  ctx: '',
};

export const GUTTER_BG: Record<DiffLine['kind'], string> = {
  add: 'bg-emerald-100/70 text-emerald-700',
  del: 'bg-rose-100/70 text-rose-700',
  ctx: 'text-gray-400',
};

export const SIGN: Record<DiffLine['kind'], string> = { add: '+', del: '−', ctx: ' ' };
