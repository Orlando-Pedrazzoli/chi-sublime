import { cn } from '@/lib/utils/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('mb-1.5 block text-sm font-medium text-chi-charcoal', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-chi-danger">*</span>}
    </label>
  );
}
