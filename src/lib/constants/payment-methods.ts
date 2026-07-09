/**
 * Chi Sublime — Métodos de pagamento (apresentação)
 * ============================================================
 *
 * Etiquetas em português + ícone lucide para cada método aceite
 * no caixa. Os valores técnicos vêm do model Transaction.
 */

import type { ComponentType } from 'react';
import { Banknote, CreditCard, Smartphone, Landmark, ArrowLeftRight, Wallet } from 'lucide-react';
import type { PaymentMethod } from '@/lib/models';

export type PaymentMethodVisual = {
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

export const PAYMENT_METHOD_VISUAL: Record<PaymentMethod, PaymentMethodVisual> = {
  cash: { label: 'Numerário', icon: Banknote },
  card_terminal: { label: 'Cartão (TPA)', icon: CreditCard },
  mb_way: { label: 'MB WAY', icon: Smartphone },
  multibanco: { label: 'Multibanco', icon: Landmark },
  transfer: { label: 'Transferência', icon: ArrowLeftRight },
  other: { label: 'Outro', icon: Wallet },
};

/** Ordem de apresentação no seletor do caixa (mais usados primeiro) */
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  'cash',
  'card_terminal',
  'mb_way',
  'multibanco',
  'transfer',
  'other',
];
