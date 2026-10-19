"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../Icon";
import { buttonClass } from "../button-styles";
import { useVaultUrls } from "../useVault";
import { ContextMenu } from "./ContextMenu";
import type { MenuPosition } from "./ContextMenu";
import { NewFolderDialog } from "./NewFolderDialog";

interface Props {
  /** Folder that owns the vault's top level (the content root, or '' when there is none). */
  rootPath: string;
  existingFolders: string[];
  children: React.ReactNode;
}

interface FolderActions {
  rootPath: string;
  openMenu: (position: MenuPosition) => void;
  openNewFolder: (parent: string) => void;
}

const Ctx = createContext<FolderActions | null>(null);

export function useFolderActions(): FolderActions {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useFolderActions must be used inside <FolderActionsProvider>",
    );
  return ctx;
}

/** Owns the right-click menu and the new-folder dialog so the tree and the page header share them. */
export function FolderActionsProvider({
  rootPath,
  existingFolders,
  children,
}: Props) {
  const router = useRouter();
  const urls = useVaultUrls();
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const [folderParent, setFolderParent] = useState<string | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeDialog = useCallback(() => setFolderParent(null), []);

  const value = useMemo<FolderActions>(
    () => ({ rootPath, openMenu: setMenu, openNewFolder: setFolderParent }),
    [rootPath],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {menu && (
        <ContextMenu
          position={menu}
          onClose={closeMenu}
          onNewDocument={() => {
            closeMenu();
            router.push(urls.newDoc(menu.folder || undefined));
          }}
          onNewFolder={() => {
            closeMenu();
            setFolderParent(menu.folder);
          }}
        />
      )}
      {folderParent !== null && (
        <NewFolderDialog
          parent={folderParent}
          existingFolders={existingFolders}
          onClose={closeDialog}
        />
      )}
    </Ctx.Provider>
  );
}

/** Header button: starts a folder inside the folder being browsed. */
export function NewFolderButton({ parent }: { parent: string }) {
  const { openNewFolder } = useFolderActions();
  return (
    <button
      type="button"
      onClick={() => openNewFolder(parent)}
      className={buttonClass("secondary")}
    >
      <Icon name="folder" />
      New folder
    </button>
  );
}
