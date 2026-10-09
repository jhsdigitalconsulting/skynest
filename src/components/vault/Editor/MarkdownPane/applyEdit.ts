import type { Edit } from '../commands';

/**
 * Replace a range via `insertText` so the browser's undo stack keeps working,
 * falling back to a plain value update where that's unsupported.
 */
export function applyEdit(el: HTMLTextAreaElement, edit: Edit, onChange: (v: string) => void) {
  el.focus();
  el.setSelectionRange(edit.from, edit.to);
  const ok = edit.text ? document.execCommand('insertText', false, edit.text) : document.execCommand('delete');
  if (!ok) {
    const v = el.value;
    onChange(v.slice(0, edit.from) + edit.text + v.slice(edit.to));
    requestAnimationFrame(() => el.setSelectionRange(edit.selStart, edit.selEnd));
    return;
  }
  el.setSelectionRange(edit.selStart, edit.selEnd);
}
