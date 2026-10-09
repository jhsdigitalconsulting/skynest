'use client';

import type { EditorFields } from '@/lib/vault-ui/types';
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

const INPUT =
  'block w-full rounded-lg border-0 bg-white text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500';

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

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="doc-description" className="mb-1 block text-xs font-medium text-gray-500">
            Description
          </label>
          <input
            id="doc-description"
            value={fields.description}
            onChange={(e) => onChange('description', e.target.value)}
            disabled={disabled}
            placeholder="One line that tells agents and people what this is for"
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tags</label>
          <TagInput value={fields.tags} onChange={(tags) => onChange('tags', tags)} disabled={disabled} />
        </div>
        {isNew ? (
          <div>
            <label htmlFor="doc-type" className="mb-1 block text-xs font-medium text-gray-500">
              Type
            </label>
            <select
              id="doc-type"
              value={fields.type}
              onChange={(e) => onChange('type', e.target.value)}
              disabled={disabled}
              className={INPUT}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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
