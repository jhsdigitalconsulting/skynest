'use client';

import { useState } from 'react';
import { saveVaultSettingsAction } from '../../routes/actions';
import type { VaultSettingsInput } from '../../lib/vault-settings';
import type { LinkTarget } from '../../lib/wikilinks';
import { Icon } from '../Icon';
import { useEditorGuards } from '../Editor/useEditorGuards';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';
import { AdvancedSection } from './AdvancedSection';
import { AgentSection } from './AgentSection';
import { DetailsSection } from './DetailsSection';
import { FoldersSection } from './FoldersSection';

export interface VaultSettingsProps {
  initial: VaultSettingsInput;
  /** What the header shows while no name is saved (the deployment's label or the id). */
  fallbackName: string;
  /** Documents that can be picked as folder templates. */
  docs: LinkTarget[];
  /** Settings the page doesn't edit, as YAML. */
  otherYaml: string;
}

/** Edits the vault's .context/config.yaml. One save for the whole page; it's committed like any other vault change. */
export function VaultSettings({ initial, fallbackName, docs, otherYaml }: VaultSettingsProps) {
  const vaultId = useVaultId();
  const { run, pending } = useVaultAction();
  const [fields, setFields] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const valid = fields.name.trim().length > 0;

  const update = (patch: Partial<VaultSettingsInput>) => setFields((f) => ({ ...f, ...patch }));
  const updateFolder = (path: string, patch: { description?: string; template?: string }) =>
    setFields((f) => ({ ...f, folders: f.folders.map((x) => (x.path === path ? { ...x, ...patch } : x)) }));

  const save = () => {
    if (!dirty || !valid || pending) return;
    const next = fields;
    run(() => saveVaultSettingsAction(vaultId, next), (r) => r.ok && setSaved(next));
  };
  useEditorGuards(dirty && !pending, save);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-5"
    >
      <DetailsSection name={fields.name} description={fields.description} fallbackName={fallbackName} onChange={update} />
      <FoldersSection folders={fields.folders} docs={docs} onChange={updateFolder} />
      <AgentSection tools={fields.agentTools} directive={fields.directive} onChange={update} />
      <AdvancedSection yaml={otherYaml} />
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/95 py-3 backdrop-blur">
        <span aria-live="polite" className={`text-sm ${dirty ? 'text-amber-700' : 'text-gray-500'}`}>
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <button type="submit" disabled={!dirty || !valid || pending} className={buttonClass('primary')}>
          <Icon name="check" />
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
