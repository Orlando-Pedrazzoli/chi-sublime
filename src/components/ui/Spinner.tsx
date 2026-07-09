import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-chi-green-soft', className)} />;
}

/** Spinner centrado num contentor, com legenda opcional */
export function LoadingState({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-chi-charcoal-soft">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
