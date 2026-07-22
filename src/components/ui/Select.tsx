// 📄 src/components/ui/Select.tsx
/**
 * Chi Sublime — Select (UI partilhado)
 * ⚠️ FIX bug Tailwind v4 + Next 16: dimensões, padding, borda
 * e posição do chevron em INLINE STYLE. API inalterada.
 */

import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { SelectOption } from '@/types/common';

const BORDER = '#e8e4da';
const DANGER = '#b23c3c';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  /** Opções; em alternativa, passar <option> como children */
  options?: SelectOption[];
  /** Placeholder mostrado como opção desativada inicial */
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, options, placeholder, className, style, children, value, ...props },
  ref,
) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        ref={ref}
        value={value}
        className={cn(
          'w-full appearance-none transition-colors',
          'focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        )}
        style={{
          height: '44px',
          padding: '0 36px 0 12px',
          borderRadius: '8px',
          border: `1px solid ${error ? DANGER : BORDER}`,
          backgroundColor: '#ffffff',
          fontSize: '14px',
          color: '#1a1a1a',
          ...style,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        size={16}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '50%',
          right: '12px',
          transform: 'translateY(-50%)',
          color: '#5a5a5a',
        }}
      />
    </div>
  );
});
