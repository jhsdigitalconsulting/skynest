import { Icon } from '../Icon';
import { FOCUS_RING } from '../button-styles';

interface Props {
  count: number;
  colSpan: number;
  onExpand: () => void;
}

export function GapRow({ count, colSpan, onExpand }: Props) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-y border-gray-100 bg-gray-50 p-0">
        <button
          type="button"
          onClick={onExpand}
          className={`flex w-full items-center gap-2 px-3 py-1 text-left font-sans text-xs text-indigo-700 hover:bg-indigo-50 ${FOCUS_RING} focus-visible:ring-inset`}
        >
          <Icon name="chevronDown" className="h-3.5 w-3.5" />
          Show {count} unchanged {count === 1 ? 'line' : 'lines'}
        </button>
      </td>
    </tr>
  );
}
