// 📄 src/components/admin/checkout/ServiceLines.tsx
'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type CartLine = {
  serviceId: string;
  name: string;
  price: number; // líquido unitário, cêntimos
  quantity: number;
  discount: number; // %
  vatRate: number;
};

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Subtotal líquido da linha (com desconto). */
export function lineNet(line: CartLine): number {
  return Math.round(line.price * line.quantity * (1 - line.discount / 100));
}

export type ServiceLinesProps = {
  lines: CartLine[];
  onQuantity: (serviceId: string, quantity: number) => void;
  onDiscount: (serviceId: string, discount: number) => void;
  onRemove: (serviceId: string) => void;
};

export function ServiceLines({ lines, onQuantity, onDiscount, onRemove }: ServiceLinesProps) {
  if (lines.length === 0) {
    return (
      <div className="border-chi-border text-chi-charcoal-light flex h-full min-h-[160px] items-center justify-center rounded-md border border-dashed text-center text-sm">
        Toca num serviço para começar.
      </div>
    );
  }

  return (
    <div className="divide-chi-border-light divide-y">
      {lines.map((line) => (
        <div key={line.serviceId} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-chi-charcoal truncate font-medium">{line.name}</p>
            <p className="text-chi-charcoal-light text-xs">{money(line.price)} /un.</p>
          </div>

          {/* Stepper de quantidade */}
          <div className="border-chi-border flex items-center rounded-md border">
            <button
              type="button"
              onClick={() => onQuantity(line.serviceId, Math.max(1, line.quantity - 1))}
              aria-label="Menos"
              className="text-chi-charcoal-soft hover:bg-chi-sand flex h-9 w-9 items-center justify-center transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(line.serviceId, Math.min(99, line.quantity + 1))}
              aria-label="Mais"
              className="text-chi-charcoal-soft hover:bg-chi-sand flex h-9 w-9 items-center justify-center transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Desconto */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={line.discount || ''}
              onChange={(e) =>
                onDiscount(line.serviceId, Math.min(100, Math.max(0, Number(e.target.value) || 0)))
              }
              placeholder="0"
              aria-label="Desconto %"
              className={cn(
                'border-chi-border h-9 w-12 rounded-md border bg-white px-1 text-center text-sm',
                'focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
              )}
            />
            <span className="text-chi-charcoal-light text-xs">%</span>
          </div>

          {/* Total da linha */}
          <span className="text-chi-charcoal w-20 text-right text-sm font-semibold tabular-nums">
            {money(lineNet(line))}
          </span>

          <button
            type="button"
            onClick={() => onRemove(line.serviceId)}
            aria-label="Remover"
            className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-1.5 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
