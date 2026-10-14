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
      <div>
        {mode === 'visual' ? (
          <VisualPane value={body} onChange={setBody} disabled={pending} controls={<ModeSwitch mode={mode} onChange={setMode} />} links={links} />
        ) : (
          <MarkdownPane value={body} onChange={setBody} mode={mode} onModeChange={setMode} disabled={pending} links={links} />
        )}
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-xs text-gray-500">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" onClick={save} disabled={!dirty || pending} className={buttonClass('primary')}>
          <Icon name="check" />
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
