'use client';

import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

export interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
