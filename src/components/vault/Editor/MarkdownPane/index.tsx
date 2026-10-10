'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { contextnestHref } from '@/lib/vault-ui/wikilinks';
import { Markdown } from '../../Markdown';
import type { VaultLinks } from '../../Markdown';
import { continueList, linkTo } from '../commands';
import { DocLinkDialog, titleOf } from '../dialogs/DocLinkDialog';
import type { Command } from '../commands';
import { applyEdit } from './applyEdit';
import { SHORTCUTS, Toolbar } from '../Toolbar';
import { ModeSwitch } from '../ModeSwitch';
import type { EditorMode } from '../ModeSwitch';

export interface MarkdownPaneProps {
  value: string;
  onChange: (value: string) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  disabled?: boolean;
  /** Resolves links between documents in the preview, and lists them for the document picker. */
  links: VaultLinks;
}

export function MarkdownPane({ value, onChange, mode, onModeChange, disabled, links }: MarkdownPaneProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [picking, setPicking] = useState(false);

  // Grow with the content so the page, not the textarea, scrolls.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 480)}px`;
  }, [value, mode]);

  const run = useCallback(
    (command: Command) => {
      const el = ref.current;
      if (!el) return;
      if (mode === 'preview') onModeChange('write');
      applyEdit(el, command({ value: el.value, start: el.selectionStart, end: el.selectionEnd }), onChange);
    },
    [mode, onChange, onModeChange],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setPicking(true);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const command = SHORTCUTS[e.key.toLowerCase()];
      if (command) {
        e.preventDefault();
        run(command);
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      const edit = continueList({ value: el.value, start: el.selectionStart, end: el.selectionEnd });
      if (edit) {
        e.preventDefault();
        applyEdit(el, edit, onChange);
      }
    }
  };

  const showEditor = mode !== 'preview';
  const showPreview = mode !== 'write';

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="sticky top-14 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-2 py-1.5 backdrop-blur">
        <Toolbar onCommand={run} onDocLink={() => setPicking(true)} disabled={disabled || mode === 'preview'} />
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </div>
      <div className={mode === 'split' ? 'grid lg:grid-cols-2 lg:divide-x lg:divide-gray-200' : ''}>
        <div className={showEditor ? '' : 'hidden'}>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            spellCheck
            aria-label="Document body (markdown)"
            placeholder="Write in markdown…  Use the toolbar or ⌘B / ⌘I / ⌘K for formatting."
            className="editor-textarea block w-full resize-none border-0 bg-transparent px-6 py-5 font-mono text-[14px] leading-7 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </div>
        {showPreview && (
          <div className="min-h-[480px] px-6 py-5 sm:px-8">
            {value.trim() ? <Markdown source={value} links={links} /> : <p className="text-sm text-gray-400">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
      {picking && (
        <DocLinkDialog
          docs={links.index.docs}
          onClose={() => {
            setPicking(false);
            ref.current?.focus();
          }}
          onPick={(doc) => {
            setPicking(false);
            run(linkTo(contextnestHref(doc.id), titleOf(doc)));
          }}
        />
      )}
    </div>
  );
}
