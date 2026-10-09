'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { ToastContext } from './context';
import type { Toast, ToastTone } from './context';

const TONES: Record<ToastTone, { icon: 'check' | 'alert' | 'spark'; className: string }> = {
  success: { icon: 'check', className: 'text-emerald-600' },
  error: { icon: 'alert', className: 'text-rose-600' },
  info: { icon: 'spark', className: 'text-indigo-600' },
};

interface Props {
  children: React.ReactNode;
}

export function Toaster({ children }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-3.5 text-sm shadow-lg ring-1 ring-gray-200 animate-[toast-in_160ms_ease-out]"
          >
            <Icon name={TONES[t.tone].icon} className={`mt-0.5 h-4 w-4 shrink-0 ${TONES[t.tone].className}`} />
            <p className="flex-1 text-gray-800">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
