import { cn } from '@/lib/utils/cn';

export type EmptyStateProps = {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chi-sand text-chi-green-soft">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-serif text-lg text-chi-green-darker">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-chi-charcoal-soft">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
