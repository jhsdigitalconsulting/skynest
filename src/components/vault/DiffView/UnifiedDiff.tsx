import type { DiffRow } from './compute';
import { GapRow } from './GapRow';
import { GUTTER_BG, LineText, ROW_BG, SIGN } from './LineText';

interface Props {
  rows: DiffRow[];
  onExpand: (index: number) => void;
}

export function UnifiedDiff({ rows, onExpand }: Props) {
  return (
    <table className="diff-table w-full border-collapse font-mono text-[13px] leading-6">
      <tbody>
        {rows.map((row, i) =>
          row.kind === 'gap' ? (
            <GapRow key={`gap-${i}`} count={row.lines.length} colSpan={4} onExpand={() => onExpand(i)} />
          ) : (
            <tr key={i} className={ROW_BG[row.kind]}>
              <td className={`w-10 select-none px-2 text-right text-xs ${GUTTER_BG[row.kind]}`}>{row.oldNo ?? ''}</td>
              <td className={`w-10 select-none px-2 text-right text-xs ${GUTTER_BG[row.kind]}`}>{row.newNo ?? ''}</td>
              <td className={`w-5 select-none text-center ${GUTTER_BG[row.kind]}`}>{SIGN[row.kind]}</td>
              <td className="whitespace-pre-wrap break-words px-3 text-gray-800">
                <LineText line={row} />
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
