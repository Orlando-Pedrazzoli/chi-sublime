'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  push: (tone: ToastTone, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<
  ToastTone,
  { icon: React.ComponentType<{ size?: number; className?: string }>; ring: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, ring: 'border-chi-success/30', iconColor: 'text-chi-success' },
  error: { icon: XCircle, ring: 'border-chi-danger/30', iconColor: 'text-chi-danger' },
  info: { icon: Info, ring: 'border-chi-info/30', iconColor: 'text-chi-info' },
  warning: { icon: AlertTriangle, ring: 'border-chi-warning/30', iconColor: 'text-chi-warning' },
};

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, tone, message }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => {
          const { icon: Icon, ring, iconColor } = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-medium',
                ring,
              )}
            >
              <Icon size={18} className={cn('mt-0.5 shrink-0', iconColor)} />
              <p className="flex-1 text-sm text-chi-charcoal">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Fechar"
                className="-mr-1 shrink-0 rounded p-0.5 text-chi-charcoal-light transition-colors hover:text-chi-charcoal"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Uso interno — o hook público está em @/hooks/useToast */
export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast tem de ser usado dentro de <ToastProvider>');
  }
  return ctx;
}
