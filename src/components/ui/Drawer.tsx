// 📄 src/components/ui/Drawer.tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Side = 'right' | 'left' | 'bottom';
type Size = 'sm' | 'md' | 'lg';

const SIDE_ANCHOR: Record<Side, string> = {
  right: 'right-0 top-0 h-full',
  left: 'left-0 top-0 h-full',
  bottom: 'bottom-0 left-0 w-full rounded-t-2xl',
};

const SIDE_HIDDEN: Record<Side, string> = {
  right: 'translate-x-full',
  left: '-translate-x-full',
  bottom: 'translate-y-full',
};

const WIDTHS: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: Side;
  size?: Size;
  title?: string;
  description?: string;
  /** Impede fecho ao clicar fora / Escape (ex: durante submit) */
  dismissable?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  side = 'right',
  size = 'md',
  title,
  description,
  dismissable = true,
  children,
  footer,
}: DrawerProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;

    const raf = requestAnimationFrame(() => setShown(true));

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) onClose();
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      setShown(false);
    };
  }, [open, dismissable, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isBottom = side === 'bottom';

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'bg-chi-green-darker/40 absolute inset-0 backdrop-blur-sm transition-opacity duration-300',
          shown ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => dismissable && onClose()}
        aria-hidden
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'shadow-strong absolute flex flex-col bg-white transition-transform duration-300 ease-out',
          SIDE_ANCHOR[side],
          !isBottom && cn('w-full', WIDTHS[size]),
          isBottom && 'max-h-[85vh]',
          shown ? 'translate-x-0 translate-y-0' : SIDE_HIDDEN[side],
        )}
      >
        {(title || dismissable) && (
          <div className="border-chi-border-light flex items-start justify-between gap-4 border-b px-6 py-4">
            <div className="space-y-0.5">
              {title && <h2 className="text-chi-green-darker font-serif text-xl">{title}</h2>}
              {description && <p className="text-chi-charcoal-soft text-sm">{description}</p>}
            </div>
            {dismissable && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal -mr-2 rounded-md p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-chi-border-light flex items-center justify-end gap-3 border-t px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
