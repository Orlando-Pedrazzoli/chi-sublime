import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border bg-white px-3 text-sm text-chi-charcoal transition-colors',
        'placeholder:text-chi-charcoal-light',
        'focus:ring-2 focus:ring-chi-gold/40 focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-chi-border-light disabled:opacity-70',
        error
          ? 'border-chi-danger focus:border-chi-danger focus:ring-chi-danger/30'
          : 'border-chi-border focus:border-chi-gold',
        className,
      )}
      {...props}
    />
  );
});

/** Mensagem de erro por baixo de um campo */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-chi-danger">{children}</p>;
}
