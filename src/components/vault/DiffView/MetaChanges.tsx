import type { DocSnapshot } from '@/lib/vault-ui/types';

interface Props {
  before: DocSnapshot | null;
  after: DocSnapshot;
}

function Field({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-2.5 text-sm">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="min-w-0 space-y-1">
        {from && <p className="break-words rounded bg-rose-50 px-2 py-0.5 text-rose-800 line-through decoration-rose-300">{from}</p>}
        {to ? (
          <p className="break-words rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">{to}</p>
        ) : (
          <p className="italic text-gray-400">removed</p>
        )}
      </dd>
    </div>
  );
}

/** Frontmatter changes (title, description, type, tags), shown above the body diff. */
export function MetaChanges({ before, after }: Props) {
  const b: DocSnapshot = before ?? { title: '', description: '', tags: [], type: '', body: '' };
  const fields: { label: string; from: string; to: string }[] = [];
  if (b.title !== after.title) fields.push({ label: 'Title', from: b.title, to: after.title });
  if (b.description !== after.description) fields.push({ label: 'Description', from: b.description, to: after.description });
  if (before && b.type !== after.type) fields.push({ label: 'Type', from: b.type, to: after.type });

  const added = after.tags.filter((t) => !b.tags.includes(t));
  const removed = b.tags.filter((t) => !after.tags.includes(t));

  if (!fields.length && !added.length && !removed.length) return null;

  return (
    <dl className="divide-y divide-gray-100 border-b border-gray-200 bg-white">
      {fields.map((f) => (
        <Field key={f.label} {...f} />
      ))}
      {(added.length > 0 || removed.length > 0) && (
        <div className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-2.5 text-sm">
          <dt className="font-medium text-gray-500">Tags</dt>
          <dd className="flex flex-wrap gap-1.5">
            {removed.map((t) => (
              <span key={`-${t}`} className="rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700 line-through">
                {t}
              </span>
            ))}
            {added.map((t) => (
              <span key={`+${t}`} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                + {t}
              </span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
