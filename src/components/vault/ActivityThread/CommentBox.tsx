'use client';

import { useState } from 'react';
import { commentAction } from '@/app/vault/actions';
import { buttonClass } from '../button-styles';
import { useVaultAction } from '../useVaultAction';
import { useVaultId } from '../useVault';

export function CommentBox({ docId }: { docId: string }) {
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
        placeholder="Leave a comment…"
        aria-label="Comment"
        className="block w-full rounded-lg border-0 text-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">⌘ Enter to send</span>
        <button type="button" onClick={send} disabled={pending || !text.trim()} className={buttonClass('secondary', 'sm')}>
          Comment
        </button>
      </div>
    </div>
  );
}
