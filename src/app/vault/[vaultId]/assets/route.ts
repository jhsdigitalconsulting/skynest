import { NextResponse } from 'next/server';
import { VaultAuthError, engineFor, requireWriter } from '@/lib/vault-ui/context';
import { AssetError, storeAsset } from '@/lib/vault/assets';

/** Upload an image or video (multipart field `file`), as ContextNest Community does. */
export async function POST(request: Request, { params }: { params: Promise<{ vaultId: string }> }) {
  const vaultId = decodeURIComponent((await params).vaultId);
  try {
    const viewer = await requireWriter();
    const { storage, sync, userToken } = engineFor(viewer, vaultId);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new AssetError('Choose an image or video to upload.');
    const asset = await storeAsset({
      provider: storage.provider,
      sync,
      vaultId,
      name: file.name,
      data: Buffer.from(await file.arrayBuffer()),
      editedBy: viewer.login,
      userToken,
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    if (err instanceof VaultAuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof AssetError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('[asset upload]', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
