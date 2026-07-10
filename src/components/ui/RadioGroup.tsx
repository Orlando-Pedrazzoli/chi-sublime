// 📄 src/components/ui/RadioGroup.tsx
'use client';

import { cn } from '@/lib/utils/cn';

export type RadioOption<T extends string = string> = {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps<T extends string = string> = {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  error?: boolean;
  className?: string;
};

export function RadioGroup<T extends string = string>({
  name,
  value,
  onChange,
  options,
  error,
  className,
}: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" className={cn('space-y-2', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
              active
                ? 'border-chi-gold bg-chi-gold-soft/30'
                : 'border-chi-border hover:bg-chi-sand',
              error && !active && 'border-chi-danger',
              opt.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="accent-chi-green-deep mt-0.5 h-4 w-4"
            />
            <span className="text-chi-charcoal text-sm">
              {opt.label}
              {opt.description && (
                <span className="text-chi-charcoal-soft mt-0.5 block text-xs">
                  {opt.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
