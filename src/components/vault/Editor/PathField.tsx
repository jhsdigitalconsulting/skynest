'use client';

import { Icon } from '../Icon';
import { FIELD_FRAME, FIELD_LABEL } from './field-styles';

interface Props {
  folder: string;
  slug: string;
  onFolderChange: (folder: string) => void;
  onSlugChange: (slug: string) => void;
  folders: string[];
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Where a new document will live, drawn as one path: folder / file name .md */
export function PathField({ folder, slug, onFolderChange, onSlugChange, folders }: Props) {
  return (
    <div>
      <label htmlFor="doc-folder" className={FIELD_LABEL}>
        Location
      </label>
      <div className={`flex h-10 items-stretch overflow-hidden font-mono ${FIELD_FRAME}`}>
        <div className="flex min-w-0 basis-1/2 items-center gap-2 bg-gray-50 pl-3 pr-1">
          <Icon name="folder" className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            id="doc-folder"
            list="vault-folders"
            value={folder}
            onChange={(e) => onFolderChange(e.target.value.replace(/^\/+/, ''))}
            placeholder="folder (optional)"
            aria-label="Folder"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </div>
        <span aria-hidden className="flex items-center bg-gray-50 pr-2 text-gray-300">
          /
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 border-l border-gray-200 pl-3 pr-3">
          <Icon name="file" className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="document-name"
            aria-label="File name"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">.md</span>
        </div>
      </div>
      <datalist id="vault-folders">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <p className="mt-1.5 text-xs text-gray-400">Filled in from the title — edit it if you want a different path.</p>
    </div>
  );
}
