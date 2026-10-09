import type { DraftActivity, DraftActivityKind } from '@/lib/review/types';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import { RelativeTime } from '../RelativeTime';
import { CommentBox } from './CommentBox';

export interface ActivityThreadProps {
  docId: string;
  activity: DraftActivity[];
  canComment: boolean;
}

const KIND: Record<DraftActivityKind, { icon: IconName; verb: string; tone: string }> = {
  created: { icon: 'plus', verb: 'started this draft', tone: 'bg-gray-100 text-gray-500' },
  edited: { icon: 'edit', verb: 'edited the draft', tone: 'bg-gray-100 text-gray-500' },
  submitted: { icon: 'send', verb: 'submitted for review', tone: 'bg-amber-100 text-amber-700' },
  comment: { icon: 'message', verb: 'commented', tone: 'bg-indigo-100 text-indigo-700' },
  changes_requested: { icon: 'undo', verb: 'requested changes', tone: 'bg-rose-100 text-rose-700' },
  withdrawn: { icon: 'arrowLeft', verb: 'withdrew it from review', tone: 'bg-gray-100 text-gray-500' },
};

/** Collapse runs of consecutive edits by the same person into one entry. */
function condense(activity: DraftActivity[]): { item: DraftActivity; times: number }[] {
  const out: { item: DraftActivity; times: number }[] = [];
  for (const item of activity) {
    const last = out.at(-1);
    if (last && item.kind === 'edited' && last.item.kind === 'edited' && last.item.actor === item.actor) {
      last.item = item;
      last.times++;
    } else {
      out.push({ item, times: 1 });
    }
  }
  return out;
}

/** The draft's timeline — edits, submissions, feedback and comments — newest at the bottom. */
export function ActivityThread({ docId, activity, canComment }: ActivityThreadProps) {
  const entries = condense(activity);
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-sm font-semibold text-gray-900">Activity</p>
      <ol className="mt-3 space-y-3">
        {entries.map(({ item, times }) => {
          const k = KIND[item.kind];
          return (
            <li key={item.id} className="flex gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${k.tone}`}>
                <Icon name={k.icon} className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-900">{item.actor}</span> {k.verb}
                  {times > 1 && <span className="text-gray-400"> ({times}×)</span>}
                  <span className="text-gray-400">
                    {' · '}
                    <RelativeTime iso={item.at} />
                  </span>
                </p>
                {item.message && (
                  <p
                    className={`mt-1.5 whitespace-pre-wrap rounded-lg px-3 py-2 text-gray-800 ${
                      item.kind === 'changes_requested' ? 'bg-rose-50 ring-1 ring-rose-100' : 'bg-gray-50'
                    }`}
                  >
                    {item.message}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {canComment && <CommentBox docId={docId} />}
    </div>
  );
}
