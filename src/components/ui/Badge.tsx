import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'gold';

const TONES: Record<Tone, string> = {
  neutral: 'bg-chi-border-light text-chi-charcoal-soft',
  success: 'bg-chi-success-bg text-chi-success',
  danger: 'bg-chi-danger-bg text-chi-danger',
  warning: 'bg-chi-warning-bg text-chi-warning',
  info: 'bg-chi-info-bg text-chi-info',
  gold: 'bg-chi-gold-soft text-chi-gold-deep',
};

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  dot?: boolean;
};

export function Badge({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
