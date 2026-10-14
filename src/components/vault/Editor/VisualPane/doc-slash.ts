import { Extension } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionProps } from '@tiptap/suggestion';

/** An open `/` document search: what's been typed after the slash and where the caret is. */
export interface DocSlashState {
  query: string;
  range: Range;
  rect: DOMRect | null;
}

/** Filled in by the React side; the extension calls through it. */
export interface DocSlashBridge {
  onChange: (state: DocSlashState | null) => void;
  /** Return true when the menu handled the key (arrows, Enter, Tab). */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const docSlashKey = new PluginKey('docSlash');

function toState(props: SuggestionProps): DocSlashState {
  return { query: props.query, range: props.range, rect: props.clientRect?.() ?? null };
}

/**
 * Typing `/` at the start of a line or after a space opens a document search at
 * the caret — the inline version of the toolbar's "Link to a document" button.
 * Not inside code, where a slash is just a slash.
 */
export function docSlash(bridge: { current: DocSlashBridge | null }) {
  return Extension.create({
    name: 'docSlash',
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          pluginKey: docSlashKey,
          char: '/',
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            if ($from.parent.type.spec.code) return false;
            return !$from.marks().some((m) => m.type.name === 'code');
          },
          render: () => ({
            onStart: (props) => bridge.current?.onChange(toState(props)),
            onUpdate: (props) => bridge.current?.onChange(toState(props)),
            onExit: () => bridge.current?.onChange(null),
            onKeyDown: ({ event }) => bridge.current?.onKeyDown(event) ?? false,
          }),
        }),
      ];
    },
  });
}
