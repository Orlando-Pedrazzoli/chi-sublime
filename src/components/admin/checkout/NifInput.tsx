// 📄 src/components/admin/checkout/NifInput.tsx
'use client';

import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isValidNIF, cleanNIF } from '@/lib/utils/nif';

export type NifInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** Campo de NIF com validação PT ao vivo (indicador válido/inválido). */
export function NifInput({ value, onChange, className }: NifInputProps) {
  const cleaned = cleanNIF(value);
  const complete = cleaned.length === 9;
  const valid = complete && isValidNIF(cleaned);

  return (
    <div className={cn('relative', className)}>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
        placeholder="NIF (opcional)"
        aria-label="NIF"
        className={cn(
          'text-chi-charcoal h-11 w-full rounded-md border bg-white px-3 pr-9 text-sm transition-colors',
          'focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
          complete
            ? valid
              ? 'border-chi-success focus:border-chi-success'
              : 'border-chi-danger focus:border-chi-danger'
            : 'border-chi-border focus:border-chi-gold',
        )}
      />
      {complete && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {valid ? (
            <Check size={16} className="text-chi-success" />
          ) : (
            <AlertCircle size={16} className="text-chi-danger" />
          )}
        </span>
      )}
    </div>
  );
}
