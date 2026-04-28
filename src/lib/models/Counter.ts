/**
 * Chi Sublime — Counter Model
 * ============================================================
 *
 * Gera números sequenciais ATÓMICOS para entidades fiscalmente
 * relevantes (faturas, recibos, bookings).
 *
 * Em Portugal, a numeração de documentos fiscais TEM de ser
 * sequencial e não pode haver lacunas (exigência da AT).
 *
 * Usamos `findOneAndUpdate` com `$inc` que é uma operação atómica
 * a nível de MongoDB — mesmo que 1000 utilizadores criem reservas
 * ao mesmo tempo, cada um recebe um número único e sequencial.
 *
 * Padrões de uso:
 *   await getNextNumber("booking-2026")   → 1, 2, 3, 4...
 *   await getNextNumber("invoice-FT-2026") → 1, 2, 3...
 */

import mongoose, { Schema, model, models, type Model } from 'mongoose';

// ============================================================
// Tipo do documento
// ============================================================

export interface ICounter {
  _id: string; // chave única, ex: "booking-2026"
  seq: number; // valor atual do contador
  updatedAt: Date;
}

// ============================================================
// Schema
// ============================================================

const counterSchema = new Schema<ICounter>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  },
);

// ============================================================
// Model singleton (evita duplicação em hot-reload)
// ============================================================

export const Counter: Model<ICounter> = models.Counter || model<ICounter>('Counter', counterSchema);

// ============================================================
// Helper — getNextNumber
// ============================================================

/**
 * Incrementa atomicamente o contador identificado por `key` e devolve
 * o novo valor. Se o contador não existir, cria-o com seq=1.
 *
 * @param key Identificador único do contador (ex: "booking-2026")
 * @returns O novo valor sequencial
 *
 * @example
 * const n = await getNextNumber("booking-2026");
 * const bookingNumber = `CHI-2026-${String(n).padStart(4, "0")}`;
 * // → "CHI-2026-0001", "CHI-2026-0002", ...
 */
export async function getNextNumber(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    {
      new: true, // devolve o documento DEPOIS do update
      upsert: true, // cria se não existir
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (!counter) {
    throw new Error(`Counter "${key}" failed to update or create`);
  }

  return counter.seq;
}

/**
 * Helper para gerar números formatados de booking.
 *
 * @example
 * await generateBookingNumber()  → "CHI-2026-0001"
 */
export async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextNumber(`booking-${year}`);
  return `CHI-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * Helper para gerar números formatados de transação interna.
 *
 * @param type "income" ou "expense"
 * @example
 * await generateTransactionNumber("income")  → "RX-2026-0001"
 * await generateTransactionNumber("expense") → "DX-2026-0001"
 */
export async function generateTransactionNumber(type: 'income' | 'expense'): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === 'income' ? 'RX' : 'DX';
  const seq = await getNextNumber(`${type}-${year}`);
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}
