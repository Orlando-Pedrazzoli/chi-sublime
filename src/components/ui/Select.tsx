import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { SelectOption } from '@/types/common';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  /** Opções; em alternativa, passar <option> como children */
  options?: SelectOption[];
  /** Placeholder mostrado como opção desativada inicial */
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, options, placeholder, className, children, value, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        className={cn(
          'h-11 w-full appearance-none rounded-md border bg-white pr-9 pl-3 text-sm text-chi-charcoal transition-colors',
          'focus:ring-2 focus:ring-chi-gold/40 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-chi-border-light disabled:opacity-70',
          error
            ? 'border-chi-danger focus:border-chi-danger'
            : 'border-chi-border focus:border-chi-gold',
          className,
        )}
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
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-chi-charcoal-soft"
      />
    </div>
  );
});
