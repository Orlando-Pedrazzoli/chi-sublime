// 📄 src/components/ui/DatePicker.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Campo de data (input nativo type=date, estilizado como o Input).
 * Robusto e acessível; o calendário nativo do browser trata do picker.
 * O valor é sempre a string ISO YYYY-MM-DD.
 */
export type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  error?: boolean;
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { error, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="date"
      className={cn(
        'text-chi-charcoal h-11 w-full rounded-md border bg-white px-3 text-sm transition-colors',
        'focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
        'disabled:bg-chi-border-light disabled:cursor-not-allowed disabled:opacity-70',
        '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
        error
          ? 'border-chi-danger focus:border-chi-danger'
          : 'border-chi-border focus:border-chi-gold',
        className,
      )}
      {...props}
    />
  );
});
