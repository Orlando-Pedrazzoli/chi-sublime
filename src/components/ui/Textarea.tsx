import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full rounded-md border bg-white px-3 py-2.5 text-sm text-chi-charcoal transition-colors',
        'placeholder:text-chi-charcoal-light',
        'focus:ring-2 focus:ring-chi-gold/40 focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-chi-border-light disabled:opacity-70',
        'resize-y',
        error
          ? 'border-chi-danger focus:border-chi-danger focus:ring-chi-danger/30'
          : 'border-chi-border focus:border-chi-gold',
        className,
      )}
      {...props}
    />
  );
});
