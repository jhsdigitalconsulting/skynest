import type { ContextNode } from '@promptowl/contextnest-engine';
import { CopyButton } from './CopyButton';
import { RelativeTime } from './RelativeTime';

interface Props {
  node: ContextNode;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

/** Metadata sidebar for a document. */
export function DocDetails({ node }: Props) {
  const fm = node.frontmatter;
  const uri = `contextnest://${node.id}`;
  return (
    <dl className="divide-y divide-gray-100 rounded-xl bg-white px-4 py-1 shadow-sm ring-1 ring-gray-200">
      <Row label="Path">
        <span className="flex items-center gap-1.5">
          <code className="min-w-0 truncate font-mono text-xs text-gray-700">{node.id}</code>
          <CopyButton value={node.id} label="Copy path" />
        </span>
      </Row>
      <Row label="Reference">
        <span className="flex items-center gap-1.5">
          <code className="min-w-0 truncate font-mono text-xs text-gray-700">{uri}</code>
          <CopyButton value={uri} label="Copy URI" />
        </span>
      </Row>
      <Row label="Type">{fm.type ?? 'document'}</Row>
      {fm.author && <Row label="Author">{fm.author}</Row>}
      {fm.updated_at && (
        <Row label="Updated">
          <RelativeTime iso={fm.updated_at} />
        </Row>
      )}
      {fm.created_at && (
        <Row label="Created">
          <RelativeTime iso={fm.created_at} />
        </Row>
      )}
    </dl>
  );
}
