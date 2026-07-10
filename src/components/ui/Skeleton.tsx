// 📄 src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils/cn';

/** Bloco de carregamento (shimmer). Passa className para dimensionar. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-chi-sand animate-pulse rounded-md', className)} {...props} />;
}

/** Várias linhas de texto placeholder. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Linha de tabela em carregamento. */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="border-chi-border-light flex items-center gap-4 border-b px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-1/4' : 'flex-1')} />
      ))}
    </div>
  );
}
