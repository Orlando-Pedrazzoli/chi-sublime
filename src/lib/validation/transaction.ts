/**
 * Chi Sublime — Transaction Validation Schemas (Zod)
 * ============================================================
 *
 * Contratos de input do núcleo financeiro: receitas, despesas,
 * reembolsos, listagem/filtros e o CRUD das categorias de receita
 * e despesa.
 *
 * Convenções (espelham models/Transaction.ts):
 *   - Todos os valores em CÊNTIMOS (integer).
 *   - `amount` é o LÍQUIDO (sem IVA). O IVA é derivado na action a
 *     partir de amount + vatRate; o pre-save do model apenas VALIDA
 *     a coerência (amount + vatAmount = totalWithVat).
 *   - Receita: exige incomeCategoryId. Despesa: exige expenseCategoryId.
 *
 * Enums inline (não importar de @/lib/models — ver shared.ts).
 */

import { z } from 'zod';
import {
  objectIdSchema,
  centsSchema,
  vatRateSchema,
  hexColorSchema,
  discountPercentSchema,
  paginationSchema,
} from './shared';

/** Espelha PAYMENT_METHODS em models/Transaction.ts */
const paymentMethodSchema = z.enum([
  'cash',
  'card_terminal',
  'mb_way',
  'multibanco',
  'transfer',
  'other',
]);

// ============================================================
// RECEITA (income)
// ============================================================

/**
 * Linha de serviço no POS. `price` é o preço LÍQUIDO unitário em
 * cêntimos (igual a Service.price). O desconto aplica-se por linha.
 */
const incomeServiceLineSchema = z.object({
  serviceId: objectIdSchema,
  name: z.string().trim().min(1).max(120),
  price: centsSchema,
  quantity: z.number().int().min(1).max(99).default(1),
  discount: discountPercentSchema.default(0),
});

export const createIncomeSchema = z
  .object({
    date: z.coerce.date().optional(),
    incomeCategoryId: objectIdSchema,
    clientId: objectIdSchema.optional(),
    bookingId: objectIdSchema.optional(),
    staffId: objectIdSchema.optional(),
    /** Se vazio, tem de vir `amount` manual. */
    services: z.array(incomeServiceLineSchema).max(30).default([]),
    /** Valor líquido manual (usado quando não há linhas de serviço). */
    amount: centsSchema.optional(),
    vatRate: vatRateSchema,
    tipAmount: centsSchema.default(0),
    paymentMethod: paymentMethodSchema,
    description: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    invoiceRequested: z.boolean().default(false),
  })
  .refine((d) => d.services.length > 0 || (d.amount !== undefined && d.amount > 0), {
    message: 'Indica pelo menos um serviço ou um valor manual',
    path: ['amount'],
  });
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

// ============================================================
// DESPESA (expense)
// ============================================================

const recurringSchema = z.object({
  enabled: z.boolean().default(true),
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  nextDueDate: z.coerce.date(),
});

export const createExpenseSchema = z.object({
  date: z.coerce.date().optional(),
  expenseCategoryId: objectIdSchema,
  /** Valor líquido em cêntimos. */
  amount: centsSchema.refine((v) => v > 0, 'Valor da despesa obrigatório'),
  vatRate: vatRateSchema,
  supplier: z.string().trim().max(200).optional(),
  supplierInvoiceNumber: z.string().trim().max(50).optional(),
  invoiceFile: z.string().trim().max(500).optional(),
  paymentMethod: paymentMethodSchema,
  description: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  recurring: recurringSchema.optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ============================================================
// REEMBOLSO
// ============================================================

export const refundTransactionSchema = z.object({
  id: objectIdSchema,
  reason: z.string().trim().max(500).optional(),
});
export type RefundTransactionInput = z.infer<typeof refundTransactionSchema>;

// ============================================================
// LISTAGEM / FILTROS
// ============================================================

export const listTransactionsSchema = paginationSchema.extend({
  type: z.enum(['income', 'expense']).optional(),
  status: z.enum(['completed', 'pending', 'refunded', 'cancelled']).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  incomeCategoryId: objectIdSchema.optional(),
  expenseCategoryId: objectIdSchema.optional(),
  staffId: objectIdSchema.optional(),
  clientId: objectIdSchema.optional(),
  invoiceRequested: z.boolean().optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;

export const transactionIdSchema = z.object({ id: objectIdSchema });
export type TransactionIdInput = z.infer<typeof transactionIdSchema>;

// ============================================================
// CATEGORIAS DE RECEITA
// ============================================================

const incomeCategoryObject = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido')
    .optional(),
  description: z.string().trim().max(300).optional(),
  color: hexColorSchema.default('#1F3D2E'),
  icon: z.string().trim().max(60).optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const createIncomeCategorySchema = incomeCategoryObject;
export type CreateIncomeCategoryInput = z.infer<typeof createIncomeCategorySchema>;

export const updateIncomeCategorySchema = incomeCategoryObject
  .partial()
  .extend({ id: objectIdSchema });
export type UpdateIncomeCategoryInput = z.infer<typeof updateIncomeCategorySchema>;

// ============================================================
// CATEGORIAS DE DESPESA
// ============================================================

const expenseCategoryObject = incomeCategoryObject.extend({
  color: hexColorSchema.default('#B23C3C'),
  isFixed: z.boolean().default(false),
  monthlyBudget: centsSchema.default(0),
});

export const createExpenseCategorySchema = expenseCategoryObject;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export const updateExpenseCategorySchema = expenseCategoryObject
  .partial()
  .extend({ id: objectIdSchema });
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;

export const categoryIdSchema = z.object({ id: objectIdSchema });
export type CategoryIdInput = z.infer<typeof categoryIdSchema>;
