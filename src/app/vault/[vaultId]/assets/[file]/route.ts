import { NextResponse } from 'next/server';
import { CONTENT_TYPES, extensionOf } from '@/lib/vault-ui/assets';
import { VaultAuthError, engineFor, requireViewer } from '@/lib/vault-ui/context';
import { AssetError, assetPath } from '@/lib/vault/assets';

/** Serve a stored image or video to signed-in viewers of the vault. */
export async function GET(_request: Request, { params }: { params: Promise<{ vaultId: string; file: string }> }) {
  const { vaultId, file } = await params;
  try {
    const viewer = await requireViewer();
    const { storage } = engineFor(viewer, decodeURIComponent(vaultId));
    const name = decodeURIComponent(file);
    const data = await storage.provider.read(assetPath(name));
    if (!data) return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': CONTENT_TYPES[extensionOf(name)],
        // Names are random uuids, so content never changes; private because access is per user.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    if (err instanceof VaultAuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AssetError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
