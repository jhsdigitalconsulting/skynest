import { redirect } from 'next/navigation';
import { ContextEditor } from '@/components/vault/ContextEditor';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { engineFor, requireViewer } from '@/lib/vault-ui/context';
import { vaultUrls } from '@/lib/vault-ui/paths';

interface Props {
  params: Promise<{ vaultId: string }>;
}

export const metadata = { title: 'Vault instructions' };

export default async function ContextPage({ params }: Props) {
  const { vaultId } = await params;
  const viewer = await requireViewer();
  if (!viewer.isReviewer) redirect(vaultUrls(vaultId).browse());
  const { storage } = engineFor(viewer, vaultId);
  const contextMd = await storage.readContextMd();

  return (
    <div className={`${PAGE_CONTAINER} max-w-4xl py-6`}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Vault instructions</h1>
      <p className="mt-1.5 text-gray-600">
        This is the vault&rsquo;s <code className="rounded bg-gray-100 px-1 text-sm">CONTEXT.md</code>: its identity and
        operating instructions. AI clients read it first, before any document. Saving publishes it immediately — it
        doesn&rsquo;t go through review.
      </p>
      <div className="mt-5">
        <ContextEditor initial={contextMd ?? ''} />
      </div>
    </div>
  );
}
