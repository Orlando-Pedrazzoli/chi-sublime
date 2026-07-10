// 📄 src/components/ui/Checkbox.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: React.ReactNode;
  error?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, className, disabled, ...props },
  ref,
) {
  return (
    <label
      className={cn(
        'text-chi-charcoal inline-flex cursor-pointer items-center gap-2 text-sm select-none',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={cn(
          'accent-chi-green-deep h-4 w-4 rounded border transition-colors',
          'focus-visible:ring-chi-gold/40 focus-visible:ring-2 focus-visible:outline-none',
          error ? 'border-chi-danger' : 'border-chi-border',
          className,
        )}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
});
