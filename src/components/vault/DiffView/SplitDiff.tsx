import type { DiffLine, DiffRow } from './compute';
import { GapRow } from './GapRow';
import { GUTTER_BG, LineText, ROW_BG } from './LineText';

interface Props {
  rows: DiffRow[];
  onExpand: (index: number) => void;
}

type SplitRow =
  | { kind: 'pair'; left: DiffLine | null; right: DiffLine | null }
  | { kind: 'gap'; index: number; count: number };

/** Line up removals with the additions that replaced them, side by side. */
function toSplitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let dels: DiffLine[] = [];
  let adds: DiffLine[] = [];
  const flush = () => {
    for (let i = 0; i < Math.max(dels.length, adds.length); i++) {
      out.push({ kind: 'pair', left: dels[i] ?? null, right: adds[i] ?? null });
    }
    dels = [];
    adds = [];
  };
  rows.forEach((row, index) => {
    if (row.kind === 'del') dels.push(row);
    else if (row.kind === 'add') adds.push(row);
    else {
      flush();
      if (row.kind === 'gap') out.push({ kind: 'gap', index, count: row.lines.length });
      else out.push({ kind: 'pair', left: row, right: row });
    }
  });
  flush();
  return out;
}

function Side({ line, side }: { line: DiffLine | null; side: 'old' | 'new' }) {
  if (!line) {
    return (
      <>
        <td className="w-10 bg-gray-50" />
        <td className="border-r border-gray-100 bg-gray-50" />
      </>
    );
  }
  const no = side === 'old' ? line.oldNo : line.newNo;
  return (
    <>
      <td className={`w-10 select-none px-2 text-right align-top text-xs ${GUTTER_BG[line.kind]}`}>{no ?? ''}</td>
      <td className={`w-1/2 whitespace-pre-wrap break-words border-r border-gray-100 px-3 align-top text-gray-800 ${ROW_BG[line.kind]}`}>
        <LineText line={line} />
      </td>
    </>
  );
}

export function SplitDiff({ rows, onExpand }: Props) {
  return (
    <table className="diff-table w-full table-fixed border-collapse font-mono text-[13px] leading-6">
      <colgroup>
        <col className="w-10" />
        <col />
        <col className="w-10" />
        <col />
      </colgroup>
      <tbody>
        {toSplitRows(rows).map((row, i) =>
          row.kind === 'gap' ? (
            <GapRow key={`gap-${i}`} count={row.count} colSpan={4} onExpand={() => onExpand(row.index)} />
          ) : (
            <tr key={i}>
              <Side line={row.left} side="old" />
              <Side line={row.right} side="new" />
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
