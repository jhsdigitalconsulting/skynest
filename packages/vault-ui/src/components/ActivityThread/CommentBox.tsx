'use client';

import { FIELD_TEXTAREA } from '../field-styles';
import { useState } from 'react';
import { commentAction } from '../../routes/actions';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';
import { useShortcutLabel } from '../useShortcutLabel';

export function CommentBox({ docId }: { docId: string }) {
  const keys = useShortcutLabel();
  const [text, setText] = useState('');
  const { run, pending } = useVaultAction();
  const vaultId = useVaultId();
  const send = () => {
    if (!text.trim() || pending) return;
    run(() => commentAction(vaultId, docId, text.trim()), (r) => r.ok && setText(''));
  };

  return (
    <div className="mt-4">
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
        }}
        readOnly={pending}
        placeholder="Leave a comment…"
        aria-label="Comment"
        className={FIELD_TEXTAREA}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{keys('⌘ Enter')} to send</span>
        <button type="button" onClick={send} disabled={pending || !text.trim()} className={buttonClass('secondary', 'sm')}>
          Comment
        </button>
      </div>
    </div>
  );
}
