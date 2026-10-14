'use client';

import { useMemo, useRef, useState } from 'react';
import { saveContextMdAction } from '@/app/vault/actions';
import { joinContextMd, splitContextMd } from '@/lib/vault-ui/context-md';
import type { LinkIndex } from '@/lib/vault-ui/wikilinks';
import { Icon } from '../Icon';
import { useEditorGuards } from '../Editor/useEditorGuards';
import { MarkdownPane } from '../Editor/MarkdownPane';
import { ModeSwitch } from '../Editor/ModeSwitch';
import type { EditorMode } from '../Editor/ModeSwitch';
import { VisualPane } from '../Editor/VisualPane';
import { RestoreBanner } from '../Editor/RestoreBanner';
import { useLocalBackup } from '../Editor/useLocalBackup';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';

export interface ContextEditorProps {
  /** The current CONTEXT.md, or an empty string when the vault has none yet. */
  initial: string;
  /** The vault's documents, for document links. */
  linkIndex: LinkIndex;
}

/**
 * The same visual / markdown editor used for documents, applied to CONTEXT.md.
 * Any YAML frontmatter is kept exactly as it was and written back on save.
 */
export function ContextEditor({ initial, linkIndex }: ContextEditorProps) {
  const vaultId = useVaultId();
  const { run, pending } = useVaultAction();
  const head = useRef(splitContextMd(initial).head);
  const [body, setBody] = useState(() => splitContextMd(initial).body);
  const [saved, setSaved] = useState(body);
  const [mode, setMode] = useState<EditorMode>('visual');
  const links = useMemo(() => ({ vaultId, index: linkIndex }), [vaultId, linkIndex]);
  const dirty = body !== saved;
  const backup = useLocalBackup<string>(
    `skynest.backup.${vaultId}.__context__`,
    body,
    dirty,
    (v): v is string => typeof v === 'string' && v !== splitContextMd(initial).body,
  );
  const restore = () => {
    if (backup.offer) setBody(backup.offer.value);
    backup.dismissOffer();
  };

  const save = () => {
    const next = body;
    run(
      () => saveContextMdAction(vaultId, joinContextMd({ head: head.current, body: next })),
      (r) => r.ok && setSaved(next),
    );
  };

  useEditorGuards(dirty && !pending, () => {
    if (dirty && !pending) save();
  });

  return (
    <div>
      {backup.offer && <RestoreBanner savedAt={backup.offer.savedAt} onRestore={restore} onDismiss={backup.dismissOffer} />}
      <div>
        {mode === 'visual' ? (
          <VisualPane value={body} onChange={setBody} controls={<ModeSwitch mode={mode} onChange={setMode} />} links={links} />
        ) : (
          <MarkdownPane value={body} onChange={setBody} mode={mode} onModeChange={setMode} links={links} />
        )}
      </div>
      {/* Sticky so the save button stays in reach on a long file. Saving goes live for every agent straight away. */}
      <div className="sticky bottom-0 z-20 mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/95 py-3 backdrop-blur">
        <span aria-live="polite" className={`text-sm ${dirty ? 'text-amber-700' : 'text-gray-500'}`}>
          {dirty ? 'Unsaved changes — saving publishes them to every agent' : 'All changes saved'}
        </span>
        <button type="button" onClick={save} disabled={!dirty || pending} className={buttonClass('primary')}>
          <Icon name="check" />
          {pending ? 'Publishing…' : 'Save & publish'}
        </button>
      </div>
    </div>
  );
}
