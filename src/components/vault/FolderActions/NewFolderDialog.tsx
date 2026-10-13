"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveNewFolderPath } from "@/lib/vault-ui/folder-path";
import { Dialog } from "../Dialog";
import { buttonClass } from "../button-styles";
import { useVaultUrls } from "../useVault";

interface Props {
  parent: string;
  existingFolders: string[];
  onClose: () => void;
}

/** Asks for a folder name, then opens the new-document editor there: a folder exists once it holds a document. */
export function NewFolderDialog({ parent, existingFolders, onClose }: Props) {
  const router = useRouter();
  const urls = useVaultUrls();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = resolveNewFolderPath(parent, name, existingFolders);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.push(urls.newDoc(result.path));
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New folder"
      description="Folders appear in the tree once they hold a document, so you’ll start the first one now."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("ghost")}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-folder-form"
            className={buttonClass("primary")}
          >
            Create and add document
          </button>
        </>
      }
    >
      <form id="new-folder-form" onSubmit={submit}>
        <label
          htmlFor="new-folder-name"
          className="mb-1 block text-xs font-medium text-gray-500"
        >
          Folder name
        </label>
        <div className="flex items-stretch overflow-hidden rounded-lg bg-white font-mono text-sm outline outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500">
          {parent && (
            <span className="flex items-center bg-gray-50 px-3 text-gray-500">
              {parent}/
            </span>
          )}
          <input
            id="new-folder-name"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="folder-name"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </div>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
