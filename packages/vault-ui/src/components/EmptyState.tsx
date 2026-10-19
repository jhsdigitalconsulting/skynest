import { Icon } from './Icon';
import type { IconName } from './Icon';

interface Props {
  icon: IconName;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, children, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-gray-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
