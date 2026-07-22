// 📄 src/components/ui/Button.tsx
/**
 * Chi Sublime — Button (UI partilhado)
 * ============================================================
 * ⚠️ FIX (bug Tailwind v4 + Next 16): alturas (h-11), paddings
 * (px-5) e cores (bg-chi-*) via classe eram ignorados →
 * botões "espremidos" em todo o admin. Dimensões, padding,
 * gap, radius e cores passaram para INLINE STYLE.
 * API inalterada (variant, size, loading, fullWidth).
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/* Tokens (espelho do globals.css) */
const C = {
  greenDeep: '#1f3d2e',
  greenDarker: '#142820',
  gold: '#d4af6e',
  cream: '#faf7f2',
  charcoal: '#1a1a1a',
  border: '#e8e4da',
  danger: '#b23c3c',
} as const;

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: C.greenDeep,
    color: C.cream,
    boxShadow: '0 4px 12px rgba(31, 61, 46, 0.08)',
  },
  secondary: { backgroundColor: C.gold, color: C.greenDarker },
  outline: {
    backgroundColor: 'transparent',
    color: C.charcoal,
    border: `1px solid ${C.border}`,
  },
  ghost: { backgroundColor: 'transparent', color: C.charcoal },
  danger: { backgroundColor: C.danger, color: '#ffffff' },
};

const SIZE_STYLES: Record<Size, React.CSSProperties> = {
  sm: { height: '36px', padding: '0 14px', gap: '6px', fontSize: '13px' },
  md: { height: '44px', padding: '0 20px', gap: '8px', fontSize: '14px' },
  lg: { height: '52px', padding: '0 28px', gap: '10px', fontSize: '16px' },
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    fullWidth,
    disabled,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all',
        'focus-visible:ring-chi-gold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:opacity-90 active:opacity-80',
        className,
      )}
      style={{
        borderRadius: '8px',
        whiteSpace: 'nowrap',
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        ...(fullWidth ? { width: '100%' } : {}),
        ...style, // permite override pontual pelo caller
      }}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});
