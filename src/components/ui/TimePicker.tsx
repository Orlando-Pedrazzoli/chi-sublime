// 📄 src/components/ui/TimePicker.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Campo de hora (input nativo type=time, estilizado como o Input).
 * O valor é a string HH:MM. Usa step=900 (15 min) por defeito para
 * marcações; passa step para alterar a granularidade.
 */
export type TimePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  error?: boolean;
};

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { error, className, step = 900, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="time"
      step={step}
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
