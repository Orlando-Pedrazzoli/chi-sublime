/**
 * Chi Sublime — GiftCard (Vale / Cartão-presente)
 * ============================================================
 *
 * Versão enxuta: o cliente compra o vale no salão, recebe um CÓDIGO,
 * e usa-o como forma de pagamento no caixa (POS). Sem página pública
 * nem pagamento online.
 *
 * Fluxo:
 *   1. Venda do vale → transação de receita + criação do GiftCard
 *      (balance = initialAmount).
 *   2. Resgate no caixa → método de pagamento "gift-card"; abate-se
 *      o valor usado ao balance (nunca abaixo de 0).
 *   3. balance = 0 → vale esgotado (continua active=true por histórico;
 *      redeemable() devolve false).
 *
 * Valores monetários em CÊNTIMOS (integer), como no resto do sistema.
 */

import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { customAlphabet } from 'nanoid';

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para leitura/ditado fácil.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const nanoCode = customAlphabet(CODE_ALPHABET, 10);

/** Gera um código legível: "CHI-XXXXX-XXXXX" */
export function generateGiftCardCode(): string {
  const raw = nanoCode();
  return `CHI-${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export interface GiftCardHolder {
  name?: string;
  phone?: string;
}

export interface IGiftCard {
  _id: mongoose.Types.ObjectId;
  code: string;
  /** Valor de emissão (cêntimos) */
  initialAmount: number;
  /** Saldo atual (cêntimos) */
  balance: number;
  active: boolean;
  /** A quem foi emitido (snapshot opcional) */
  issuedTo?: GiftCardHolder;
  /** Cliente associado, se registado */
  clientId?: mongoose.Types.ObjectId;
  /** Transação da VENDA do vale */
  saleTransactionId?: mongoose.Types.ObjectId;
  /** Data de validade opcional (null = sem validade) */
  expiresAt?: Date;
  note?: string;
  /** Utilizador (admin) que emitiu */
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardHolderSchema = new Schema<GiftCardHolder>(
  {
    name: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const giftCardSchema = new Schema<IGiftCard>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    initialAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'initialAmount tem de ser em cêntimos integer',
      },
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'balance tem de ser em cêntimos integer',
      },
    },
    active: { type: Boolean, default: true, index: true },
    issuedTo: giftCardHolderSchema,
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', sparse: true },
    saleTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', sparse: true },
    expiresAt: { type: Date },
    note: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  },
  { timestamps: true, versionKey: false },
);

giftCardSchema.index({ createdAt: -1 });

/** true se o vale ainda pode ser usado (ativo, com saldo e não expirado). */
giftCardSchema.methods.isRedeemable = function (this: IGiftCard): boolean {
  if (!this.active) return false;
  if (this.balance <= 0) return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  return true;
};

export const GiftCard: Model<IGiftCard> =
  models.GiftCard || model<IGiftCard>('GiftCard', giftCardSchema);
