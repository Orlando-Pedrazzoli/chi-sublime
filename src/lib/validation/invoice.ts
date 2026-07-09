/**
 * Chi Sublime — Invoice Validation Schemas (Zod)
 * ============================================================
 *
 * Contrato de emissão de fatura/recibo a partir de uma transação.
 * Consumido pela camada de faturação (Fase 3: MockProvider →
 * Moloni/InvoiceXpress). Aqui só se valida o INPUT do pedido; a
 * chamada ao provider certificado é feita depois.
 *
 * DocumentType espelha models/Transaction.ts:
 *   FT fatura · FR fatura-recibo · FS fatura simplificada
 *   NC nota de crédito · ND nota de débito
 */

import { z } from 'zod';
import { objectIdSchema, nifOptionalSchema, postalCodeSchema, emailSchema } from './shared';

/** Snapshot fiscal do cliente no momento da emissão (imutável). */
const customerSnapshotSchema = z.object({
  name: z.string().trim().min(2, 'Nome/designação obrigatório').max(200),
  vatNumber: nifOptionalSchema,
  email: emailSchema.optional(),
  address: z.string().trim().max(300).optional(),
  postalCode: postalCodeSchema.optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().length(2, 'País: código ISO de 2 letras').toUpperCase().default('PT'),
});
export type CustomerSnapshotInput = z.infer<typeof customerSnapshotSchema>;

// ============================================================
// EMITIR
// ============================================================

export const issueInvoiceSchema = z
  .object({
    transactionId: objectIdSchema,
    documentType: z.enum(['FT', 'FR', 'FS', 'NC', 'ND']).default('FR'),
    customer: customerSnapshotSchema,
    /** Enviar o PDF por email ao cliente após emissão. */
    sendEmail: z.boolean().default(true),
  })
  .refine(
    // FT e ND exigem NIF do adquirente; FS/FR até ao limite legal podem
    // ser "consumidor final". A validação fina fica no provider.
    (d) => (d.documentType !== 'FT' && d.documentType !== 'ND') || Boolean(d.customer.vatNumber),
    {
      message: 'NIF do cliente obrigatório para Fatura (FT) ou Nota de Débito (ND)',
      path: ['customer', 'vatNumber'],
    },
  );
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;

// ============================================================
// REEMITIR (retry) — após falha do provider
// ============================================================

export const retryInvoiceSchema = z.object({ transactionId: objectIdSchema });
export type RetryInvoiceInput = z.infer<typeof retryInvoiceSchema>;

// ============================================================
// NOTA DE CRÉDITO (anular fatura emitida)
// ============================================================

export const creditNoteSchema = z.object({
  transactionId: objectIdSchema,
  reason: z.string().trim().min(3, 'Motivo obrigatório').max(500),
});
export type CreditNoteInput = z.infer<typeof creditNoteSchema>;
