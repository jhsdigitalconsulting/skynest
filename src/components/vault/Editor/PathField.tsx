'use client';

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

/** Where a new document will live: a folder (with suggestions from the vault) and a file name. */
export function PathField({ folder, slug, onFolderChange, onSlugChange, folders }: Props) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">Location</label>
      <div className="flex items-stretch overflow-hidden rounded-lg bg-white font-mono text-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
        <input
          list="vault-folders"
          value={folder}
          onChange={(e) => onFolderChange(e.target.value.replace(/^\/+/, ''))}
          placeholder="folder (optional)"
          aria-label="Folder"
          className="w-2/5 min-w-0 border-0 bg-gray-50 px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
        <span className="flex items-center bg-gray-50 pr-1 text-gray-400">/</span>
        <input
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          placeholder="document-name"
          aria-label="File name"
          className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
        <span className="flex items-center pr-3 text-gray-400">.md</span>
      </div>
      <datalist id="vault-folders">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <p className="mt-1 text-xs text-gray-400">Filled in from the title — edit it if you want a different path.</p>
    </div>
  );
}
