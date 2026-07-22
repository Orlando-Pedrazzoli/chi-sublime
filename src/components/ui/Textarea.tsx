// 📄 src/components/ui/Textarea.tsx
/**
 * Chi Sublime — Textarea (UI partilhado)
 * ⚠️ FIX bug Tailwind v4 + Next 16: padding, borda e cores em
 * INLINE STYLE. API inalterada.
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

const BORDER = '#e8e4da';
const DANGER = '#b23c3c';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, style, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full transition-colors',
        'placeholder:text-chi-charcoal-light',
        'focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-70',
        'resize-y',
        className,
      )}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        border: `1px solid ${error ? DANGER : BORDER}`,
        backgroundColor: '#ffffff',
        fontSize: '14px',
        color: '#1a1a1a',
        ...style,
      }}
      {...props}
    />
  );
});
