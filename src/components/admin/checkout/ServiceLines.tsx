// 📄 src/components/admin/checkout/ServiceLines.tsx
'use client';

/**
 * ⚠️ FIX bug Tailwind v4 + Next 16: espaçamentos, steppers e
 * separadores em INLINE STYLE — as linhas do carrinho ficavam
 * coladas. Lógica e API inalteradas.
 */

import { Minus, Plus, Trash2 } from 'lucide-react';

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

const STEP_BTN: React.CSSProperties = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#5a5a5a',
};

export function ServiceLines({ lines, onQuantity, onDiscount, onRemove }: ServiceLinesProps) {
  if (lines.length === 0) {
    return (
      <div
        style={{
          minHeight: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 16px',
          borderRadius: '8px',
          border: '1px dashed #d9d2c2',
          fontSize: '13.5px',
          color: '#9a9a9a',
          textAlign: 'center',
        }}
      >
        Toca num serviço para começar.
      </div>
    );
  }

  return (
    <div>
      {lines.map((line, i) => (
        <div
          key={line.serviceId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 0',
            borderTop: i === 0 ? 'none' : '1px solid #f1eee6',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
              {line.name}
            </p>
            <p style={{ marginTop: '1px', fontSize: '11.5px', color: '#9a9a9a' }}>
              {money(line.price)} /un.
            </p>
          </div>

          {/* Stepper de quantidade */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #e8e4da',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
            }}
          >
            <button
              type="button"
              onClick={() => onQuantity(line.serviceId, Math.max(1, line.quantity - 1))}
              aria-label="Menos"
              className="hover:bg-chi-sand transition-colors"
              style={STEP_BTN}
            >
              <Minus size={14} />
            </button>
            <span
              className="tabular-nums"
              style={{ width: '28px', textAlign: 'center', fontSize: '13.5px', fontWeight: 500 }}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(line.serviceId, Math.min(99, line.quantity + 1))}
              aria-label="Mais"
              className="hover:bg-chi-sand transition-colors"
              style={STEP_BTN}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Desconto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
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
              className="focus:ring-chi-gold/40 focus:ring-2 focus:outline-none"
              style={{
                width: '46px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e8e4da',
                backgroundColor: '#ffffff',
                textAlign: 'center',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '11.5px', color: '#9a9a9a' }}>%</span>
          </div>

          {/* Total da linha */}
          <span
            className="tabular-nums"
            style={{
              width: '72px',
              textAlign: 'right',
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            {money(lineNet(line))}
          </span>

          <button
            type="button"
            onClick={() => onRemove(line.serviceId)}
            aria-label="Remover"
            className="hover:bg-chi-danger-bg hover:text-chi-danger transition-colors"
            style={{ padding: '6px', borderRadius: '6px', color: '#5a5a5a' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
