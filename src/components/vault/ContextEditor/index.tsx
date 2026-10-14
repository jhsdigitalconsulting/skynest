'use client';

import { useState } from 'react';
import { saveContextMdAction } from '@/app/vault/actions';
import { Icon } from '../Icon';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';

export interface ContextEditorProps {
  /** The current CONTEXT.md, or an empty string when the vault has none yet. */
  initial: string;
}

/** Plain-text editor for the vault's CONTEXT.md (its operating instructions for people and AI clients). */
export function ContextEditor({ initial }: ContextEditorProps) {
  const vaultId = useVaultId();
  const { run, pending } = useVaultAction();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = text !== saved;

  const save = () => run(() => saveContextMdAction(vaultId, text), (r) => r.ok && setSaved(text));

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (dirty && !pending) save();
          }
        }}
        rows={28}
        spellCheck={false}
        aria-label="CONTEXT.md"
        placeholder="# Vault name&#10;&#10;Describe this vault and how AI clients should use it…"
        className="block w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
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
