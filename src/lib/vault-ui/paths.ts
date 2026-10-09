/** URL helpers for the vault UI. Doc ids are path-like, so each segment is encoded separately. */

function encodeId(id: string): string {
  return id.split('/').map(encodeURIComponent).join('/');
}

export function decodeSegments(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join('/');
}

export type VaultUrls = ReturnType<typeof vaultUrls>;

/** Every vault page lives under /vault/<vaultId>, so links always say which vault they open. */
export function vaultUrls(vaultId: string) {
  const root = `/vault/${encodeURIComponent(vaultId)}`;
  return {
    root,
    browse: (opts: { folder?: string; q?: string; type?: string } = {}) => {
      const params = new URLSearchParams();
      if (opts.folder) params.set('folder', opts.folder);
      if (opts.q) params.set('q', opts.q);
      if (opts.type) params.set('type', opts.type);
      const qs = params.toString();
      return qs ? `${root}?${qs}` : root;
    },
    doc: (id: string, opts: { tab?: 'history'; version?: number } = {}) => {
      const params = new URLSearchParams();
      if (opts.tab) params.set('tab', opts.tab);
      if (opts.version !== undefined) params.set('v', String(opts.version));
      const qs = params.toString();
      return `${root}/doc/${encodeId(id)}${qs ? `?${qs}` : ''}`;
    },
    /** A stored image or video, by file name. */
    asset: (file: string) => `${root}/assets/${encodeURIComponent(file)}`,
    edit: (id: string) => `${root}/edit/${encodeId(id)}`,
    newDoc: (folder?: string) => (folder ? `${root}/new?folder=${encodeURIComponent(folder)}` : `${root}/new`),
    review: (tab?: string) => (tab ? `${root}/review?tab=${tab}` : `${root}/review`),
    reviewDraft: (id: string, tab?: 'preview' | 'current') =>
      `${root}/review/${encodeId(id)}${tab ? `?tab=${tab}` : ''}`,
  };
}
