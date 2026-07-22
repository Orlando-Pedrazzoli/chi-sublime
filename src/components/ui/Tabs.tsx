// 📄 src/components/ui/Tabs.tsx
/**
 * Chi Sublime — Tabs (UI partilhado)
 * ============================================================
 *
 * Usado em: StaffDetailView (Horário|Férias), ReceitasTabs,
 * DespesasTabs, ServicesTabs.
 *
 * ⚠️ FIX (bug Tailwind v4 + Next 16): as classes de padding
 * (px-4 py-2.5) e gap eram ignoradas → os separadores ficavam
 * colados, parecendo um só botão. Padding, gap, cores e
 * bordas passaram para INLINE STYLE (regra do projeto).
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

/* Tokens críticos (espelho do globals.css) */
const C = {
  greenDeep: '#1f3d2e',
  gold: '#d4af6e',
  cream: '#faf7f2',
  charcoal: '#1a1a1a',
  charcoalSoft: '#5a5a5a',
  border: '#e8e4da',
} as const;

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
        className="flex"
        style={{
          gap: '6px',
          borderBottom: variant === 'underline' ? `1px solid ${C.border}` : undefined,
        }}
      >
        {items.map((t) => {
          const on = t.id === active;

          const base: React.CSSProperties = {
            padding: '10px 18px',
            columnGap: '8px',
            whiteSpace: 'nowrap',
          };

          const variantStyle: React.CSSProperties =
            variant === 'underline'
              ? {
                  marginBottom: '-1px',
                  borderBottom: `2px solid ${on ? C.gold : 'transparent'}`,
                  color: on ? C.greenDeep : C.charcoalSoft,
                }
              : {
                  borderRadius: '999px',
                  backgroundColor: on ? C.greenDeep : 'transparent',
                  color: on ? C.cream : C.charcoalSoft,
                };

          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={t.disabled}
              onClick={() => select(t.id)}
              className={cn(
                'inline-flex items-center text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                !on && variant === 'underline' && 'hover:text-chi-charcoal',
                !on && variant === 'pills' && 'hover:bg-chi-sand',
              )}
              style={{ ...base, ...variantStyle }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {activeItem?.content !== undefined && (
        <div role="tabpanel" style={{ paddingTop: '16px' }}>
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
