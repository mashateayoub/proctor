'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastVariant = 'error' | 'success' | 'warning' | 'info';

interface ToastInput {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastEntry extends Required<Omit<ToastInput, 'durationMs'>> {
  id: string;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title = '', message, variant = 'info', durationMs }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const effectiveDuration =
        typeof durationMs === 'number' ? durationMs : variant === 'error' ? 6000 : 3200;

      setToasts((prev) => [
        ...prev.slice(-4),
        { id, title, message, variant, durationMs: effectiveDuration },
      ]);

      if (effectiveDuration > 0) {
        window.setTimeout(() => dismissToast(id), effectiveDuration);
      }
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[220] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={`pointer-events-auto rounded-[10px] border px-3 py-2.5 shadow-lg ${variantStyles[toast.variant]}`}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {toast.title ? (
                    <p className="truncate text-[12px] font-bold leading-tight">{toast.title}</p>
                  ) : null}
                  <p className="text-[12px] font-semibold leading-tight">{toast.message}</p>
                </div>
                <button
                  type="button"
                  className="rounded p-0.5 text-[11px] leading-none opacity-70 transition-opacity hover:opacity-100"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss toast"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }
  return context;
}
