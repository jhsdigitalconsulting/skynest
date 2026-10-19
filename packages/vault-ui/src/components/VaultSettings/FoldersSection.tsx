import type { FolderSetting } from '../../lib/vault-settings';
import type { LinkTarget } from '../../lib/wikilinks';
import { titleOf } from '../Editor/dialogs/DocLinkDialog/search';
import { FIELD_INPUT, FIELD_LABEL } from '../field-styles';
import { Section } from './Section';

interface Props {
  folders: FolderSetting[];
  docs: LinkTarget[];
  onChange: (path: string, fields: { description?: string; template?: string }) => void;
}

export function FoldersSection({ folders, docs, onChange }: Props) {
  return (
    <Section
      title="Folders"
      description="A description shows at the top of the folder’s page. A template is a document whose body new documents in that folder start from."
    >
      {folders.length === 0 ? (
        <p className="text-sm text-gray-500">The vault has no folders yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {folders.map((f, i) => (
            <li key={f.path} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,12rem)_1fr_1fr] sm:items-end">
              <p className="truncate font-mono text-xs text-gray-700 sm:pb-3" title={f.path}>
                {f.path}
              </p>
              <div>
                <label htmlFor={`folder-desc-${i}`} className={FIELD_LABEL}>
                  Description
                </label>
                <input
                  id={`folder-desc-${i}`}
                  value={f.description}
                  onChange={(e) => onChange(f.path, { description: e.target.value })}
                  placeholder="What goes in this folder"
                  className={FIELD_INPUT}
                />
              </div>
              <div>
                <label htmlFor={`folder-template-${i}`} className={FIELD_LABEL}>
                  Template
                </label>
                <input
                  id={`folder-template-${i}`}
                  list="vault-settings-docs"
                  value={f.template}
                  onChange={(e) => onChange(f.path, { template: e.target.value })}
                  placeholder="None — type to pick a document"
                  className={`${FIELD_INPUT} font-mono text-xs`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <datalist id="vault-settings-docs">
        {docs.map((d) => (
          <option key={d.id} value={d.id}>
            {titleOf(d)}
          </option>
        ))}
      </datalist>
    </Section>
  );
}
