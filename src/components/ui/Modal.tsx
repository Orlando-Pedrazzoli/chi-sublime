'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: Size;
  /** Impede fecho ao clicar fora / Escape (ex: durante submit) */
  dismissable?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  dismissable = true,
  children,
  footer,
}: ModalProps) {
  // Escape para fechar + bloqueio de scroll do body
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) onClose();
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, dismissable, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-chi-green-darker/40 backdrop-blur-sm"
        onClick={() => dismissable && onClose()}
        aria-hidden
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-strong sm:rounded-2xl',
          SIZES[size],
        )}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-4 border-b border-chi-border-light px-6 py-4">
            <div className="space-y-0.5">
              {title && (
                <h2 className="font-serif text-xl text-chi-green-darker">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-chi-charcoal-soft">{description}</p>
              )}
            </div>
            {dismissable && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="-mr-2 rounded-md p-1.5 text-chi-charcoal-soft transition-colors hover:bg-chi-sand hover:text-chi-charcoal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-chi-border-light px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
