// 📄 src/components/ui/Modal.tsx
/**
 * Chi Sublime — Modal (UI partilhado)
 * ⚠️ FIX bug Tailwind v4 + Next 16: paddings do header/corpo/
 * footer, gaps, radius e backdrop em INLINE STYLE — o conteúdo
 * ficava todo colado. API inalterada.
 */

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

const BORDER_LIGHT = '#f1eee6';

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
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(20, 40, 32, 0.4)' }}
        onClick={() => dismissable && onClose()}
        aria-hidden
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative z-10 flex max-h-[92vh] w-full flex-col', SIZES[size])}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 16px 40px rgba(31, 61, 46, 0.16)',
        }}
      >
        {(title || dismissable) && (
          <div
            className="flex items-start justify-between"
            style={{
              gap: '16px',
              padding: '16px 24px',
              borderBottom: `1px solid ${BORDER_LIGHT}`,
            }}
          >
            <div>
              {title && (
                <h2 className="font-serif" style={{ fontSize: '20px', color: '#142820' }}>
                  {title}
                </h2>
              )}
              {description && (
                <p style={{ marginTop: '2px', fontSize: '14px', color: '#5a5a5a' }}>
                  {description}
                </p>
              )}
            </div>
            {dismissable && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="hover:bg-chi-sand transition-colors"
                style={{
                  marginRight: '-8px',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#5a5a5a',
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
          {children}
        </div>

        {footer && (
          <div
            className="flex items-center justify-end"
            style={{
              gap: '12px',
              padding: '16px 24px',
              borderTop: `1px solid ${BORDER_LIGHT}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
