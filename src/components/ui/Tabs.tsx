// 📄 src/components/ui/Tabs.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export type TabItem = {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  /** Controlado: passa value + onChange. Não controlado: usa defaultValue. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
};

export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  const [internal, setInternal] = useState<string>(defaultValue ?? items[0]?.id ?? '');
  const active = value ?? internal;

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const activeItem = items.find((t) => t.id === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        className={cn('flex gap-1', variant === 'underline' && 'border-chi-border border-b')}
      >
        {items.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={t.disabled}
              onClick={() => select(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                variant === 'underline'
                  ? cn(
                      '-mb-px border-b-2',
                      on
                        ? 'border-chi-gold text-chi-green-deep'
                        : 'text-chi-charcoal-soft hover:text-chi-charcoal border-transparent',
                    )
                  : cn(
                      'rounded-full',
                      on
                        ? 'bg-chi-green-deep text-chi-cream'
                        : 'text-chi-charcoal-soft hover:bg-chi-sand',
                    ),
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {activeItem?.content !== undefined && (
        <div role="tabpanel" className="pt-4">
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
