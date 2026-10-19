'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon';
import { FOCUS_RING } from '../button-styles';
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

interface Timer {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

export function Toaster({ children }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, Timer>());
  const paused = useRef(false);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const start = useCallback(
    (id: number, timer: Timer) => {
      timer.startedAt = Date.now();
      timer.handle = setTimeout(() => dismiss(id), timer.remaining);
    },
    [dismiss],
  );

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message }]);
      const timer: Timer = { handle: null, remaining: tone === 'error' ? 8000 : 4000, startedAt: 0 };
      timers.current.set(id, timer);
      if (!paused.current) start(id, timer);
    },
    [start],
  );

  // Hovering or focusing a toast holds every toast on screen, so there's time to read it.
  const pause = () => {
    if (paused.current) return;
    paused.current = true;
    for (const timer of timers.current.values()) {
      if (!timer.handle) continue;
      clearTimeout(timer.handle);
      timer.handle = null;
      timer.remaining = Math.max(1000, timer.remaining - (Date.now() - timer.startedAt));
    }
  };
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    for (const [id, timer] of timers.current) if (!timer.handle) start(id, timer);
  };

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
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
              className={`rounded text-gray-500 hover:text-gray-700 ${FOCUS_RING}`}
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
