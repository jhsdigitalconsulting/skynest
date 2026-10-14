'use client';

import type { EditorFields } from '@/lib/vault-ui/types';
import { Icon } from '../Icon';
import { FIELD_INPUT, FIELD_LABEL } from '../field-styles';
import type { TagCount } from '@/lib/vault-ui/tags';
import { PathField } from './PathField';
import { TagInput } from './TagInput';

interface Props {
  fields: EditorFields;
  isNew: boolean;
  pathLocked: boolean;
  docId: string;
  folder: string;
  slug: string;
  folders: string[];
  /** Tags already used in the vault, for the tag typeahead. */
  tagVocabulary: TagCount[];
  disabled: boolean;
  onTitleChange: (title: string) => void;
  onChange: <K extends keyof EditorFields>(key: K, value: EditorFields[K]) => void;
  onFolderChange: (folder: string) => void;
  onSlugChange: (slug: string) => void;
}

const TYPES = [
  { value: 'document', label: 'Document' },
  { value: 'reference', label: 'Reference' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'persona', label: 'Persona' },
];

/** Title, description, tags, type and (for new documents) location. */
export function MetaFields(props: Props) {
  const { fields, isNew, pathLocked, disabled, onChange } = props;
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
      <input
        value={fields.title}
        onChange={(e) => props.onTitleChange(e.target.value)}
        disabled={disabled}
        placeholder="Untitled document"
        aria-label="Title"
        autoFocus={isNew && !pathLocked}
        className="block w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 disabled:text-gray-500"
      />
      {pathLocked && <p className="mt-1 font-mono text-xs text-gray-400">{props.docId}.md</p>}

      <div className="mt-6 grid items-start gap-x-4 gap-y-5 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="md:col-span-2">
          <label htmlFor="doc-description" className={FIELD_LABEL}>
            Description
          </label>
          <input
            id="doc-description"
            value={fields.description}
            onChange={(e) => onChange('description', e.target.value)}
            disabled={disabled}
            placeholder="One line that tells agents and people what this is for"
            className={FIELD_INPUT}
          />
        </div>
        <div className={isNew ? undefined : 'md:col-span-2'}>
          <label className={FIELD_LABEL}>Tags</label>
          <TagInput value={fields.tags} vocabulary={props.tagVocabulary} onChange={(tags) => onChange('tags', tags)} disabled={disabled} />
        </div>
        {isNew ? (
          <div>
            <label htmlFor="doc-type" className={FIELD_LABEL}>
              Type
            </label>
            <div className="relative">
              <select
                id="doc-type"
                value={fields.type}
                onChange={(e) => onChange('type', e.target.value)}
                disabled={disabled}
                className={`${FIELD_INPUT} appearance-none pr-9`}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Icon
                name="chevronDown"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        ) : null}
        {!pathLocked && (
          <div className="md:col-span-2">
            <PathField
              folder={props.folder}
              slug={props.slug}
              folders={props.folders}
              onFolderChange={props.onFolderChange}
              onSlugChange={props.onSlugChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
