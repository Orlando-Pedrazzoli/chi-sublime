// 📄 src/components/admin/checkout/PaymentMethodPicker.tsx
'use client';

/**
 * ⚠️ FIX bug Tailwind v4 + Next 16: grid, gaps, paddings e
 * cores em INLINE STYLE — os métodos apareciam colados.
 * Alvos táteis ≥ 56px (boas práticas POS). API inalterada.
 */

import { Banknote, Smartphone, Landmark, CreditCard, ArrowRightLeft } from 'lucide-react';

export type PaymentMethod = 'cash' | 'mb_way' | 'multibanco' | 'card_terminal' | 'transfer';

const METHODS: {
  id: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: 'cash', label: 'Numerário', icon: Banknote },
  { id: 'mb_way', label: 'MB WAY', icon: Smartphone },
  { id: 'multibanco', label: 'Multibanco', icon: Landmark },
  { id: 'card_terminal', label: 'Cartão', icon: CreditCard },
  { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft },
];

export type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
};

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        gap: '8px',
      }}
    >
      {METHODS.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className="transition-colors"
            style={{
              minHeight: '56px',
              padding: '8px 6px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '12.5px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              border: `1px solid ${active ? '#1f3d2e' : '#e8e4da'}`,
              backgroundColor: active ? '#1f3d2e' : '#ffffff',
              color: active ? '#faf7f2' : '#1a1a1a',
            }}
          >
            <Icon size={20} />
            {label}
          </button>
        );
      })}
    </div>
  );
}