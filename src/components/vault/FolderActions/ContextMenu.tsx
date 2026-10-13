"use client";

import { useEffect, useRef } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";

export interface MenuPosition {
  x: number;
  y: number;
  /** Folder the menu acts on; the vault root's path for the empty area. */
  folder: string;
}

interface Props {
  position: MenuPosition;
  onNewDocument: () => void;
  onNewFolder: () => void;
  onClose: () => void;
}

function Item({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
    >
      <Icon name={icon} className="h-4 w-4 text-gray-400" />
      {label}
    </button>
  );
}

export function ContextMenu({
  position,
  onNewDocument,
  onNewFolder,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "mousedown" && ref.current?.contains(e.target as Node))
        return;
      onClose();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-48 rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200"
    >
      <Item icon="file" label="New document" onClick={onNewDocument} />
      <Item icon="folder" label="New folder" onClick={onNewFolder} />
    </div>
  );
}
