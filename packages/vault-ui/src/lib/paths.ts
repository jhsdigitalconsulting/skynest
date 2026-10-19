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
    doc: (id: string, opts: { tab?: 'history'; version?: number; view?: 'markdown' } = {}) => {
      const params = new URLSearchParams();
      if (opts.tab) params.set('tab', opts.tab);
      if (opts.view) params.set('view', opts.view);
      if (opts.version !== undefined) params.set('v', String(opts.version));
      const qs = params.toString();
      return `${root}/doc/${encodeId(id)}${qs ? `?${qs}` : ''}`;
    },
    /** A stored image or video, by file name. */
    asset: (file: string) => `${root}/assets/${encodeURIComponent(file)}`,
    edit: (id: string) => `${root}/edit/${encodeId(id)}`,
    newDoc: (folder?: string) => (folder ? `${root}/new?folder=${encodeURIComponent(folder)}` : `${root}/new`),
    /** The vault's CONTEXT.md operating instructions. */
    context: `${root}/context`,
    /** Vault settings: name, folders and agent files (.context/config.yaml). */
    settings: `${root}/settings`,
    review: (tab?: string) => (tab ? `${root}/review?tab=${tab}` : `${root}/review`),
    /** `tab` picks the preview/changes/published view; `list` keeps the queue's left-hand tab. */
    /** The editor inside the review pane, so the queue stays on screen while you edit. */
    reviewEdit: (id: string, list?: string) => {
      const params = new URLSearchParams({ edit: '1' });
      if (list) params.set('list', list);
      return `${root}/review/${encodeId(id)}?${params.toString()}`;
    },
    reviewDraft: (id: string, tab?: 'changes' | 'current', list?: string) => {
      const params = new URLSearchParams();
      if (tab) params.set('tab', tab);
      if (list) params.set('list', list);
      const qs = params.toString();
      return `${root}/review/${encodeId(id)}${qs ? `?${qs}` : ''}`;
    },
  };
}
