// 📄 src/components/ui/Input.tsx
/**
 * Chi Sublime — Input (UI partilhado)
 * ⚠️ FIX bug Tailwind v4 + Next 16: altura, padding, borda e
 * cores em INLINE STYLE. API inalterada.
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

const BORDER = '#e8e4da';
const DANGER = '#b23c3c';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, style, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full transition-colors',
        'placeholder:text-chi-charcoal-light',
        'focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-70',
        className,
      )}
      style={{
        height: '44px',
        padding: '0 12px',
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

/** Mensagem de erro por baixo de um campo */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p style={{ marginTop: '4px', fontSize: '12px', color: DANGER }}>{children}</p>;
}
