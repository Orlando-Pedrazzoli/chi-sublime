// 📄 src/components/admin/checkout/PaymentMethodPicker.tsx
'use client';

import { Banknote, Smartphone, Landmark, CreditCard, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

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

/** Botões grandes (alvos táteis ≥ 44px) para escolha rápida do método. */
export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {METHODS.map(({ id, label, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-chi-green-deep bg-chi-green-deep text-chi-cream'
                : 'border-chi-border text-chi-charcoal hover:border-chi-gold hover:bg-chi-sand bg-white',
            )}
          >
            <Icon size={20} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
