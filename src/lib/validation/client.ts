/**
 * Chi Sublime — Client Validation Schemas (Zod)
 * ============================================================
 *
 * Contratos de input para o CRUD de clientes do salão.
 * Campos calculados (totalSpent, visitCount, averageTicket,
 * loyaltyPoints, lastVisit) NÃO são editáveis por aqui — são
 * derivados pelo sistema.
 *
 * Enums inline (não importar de @/lib/models — ver shared.ts).
 * CLIENT_SOURCES espelhado de models/Client.ts.
 */

import { z } from 'zod';
import {
  objectIdSchema,
  humanNameSchema,
  emailSchema,
  ptPhoneSchema,
  nifOptionalSchema,
  postalCodeSchema,
  paginationSchema,
} from './shared';

/** Espelha CLIENT_SOURCES em models/Client.ts */
const clientSourceSchema = z.enum(['online', 'walk-in', 'phone', 'referral', 'instagram']);

/** Dados fiscais opcionais do cliente (para faturação). */
const clientFiscalSchema = z
  .object({
    vatNumber: nifOptionalSchema,
    fullLegalName: z.string().trim().max(200).optional(),
    address: z.string().trim().max(300).optional(),
    postalCode: postalCodeSchema.optional(),
    city: z.string().trim().max(100).optional(),
    country: z
      .string()
      .trim()
      .length(2, 'País: código ISO de 2 letras')
      .toUpperCase()
      .default('PT'),
  })
  .optional();

// ============================================================
// CREATE / UPDATE
// ============================================================

const clientObject = z.object({
  name: humanNameSchema,
  phone: ptPhoneSchema,
  email: emailSchema.optional(),
  birthday: z.coerce.date().optional(),
  fiscalData: clientFiscalSchema,
  preferredStaffId: objectIdSchema.optional(),
  preferredInvoiceEmail: emailSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  source: clientSourceSchema.default('walk-in'),
  referredBy: objectIdSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20, 'Máximo 20 tags').default([]),
  marketingConsent: z.boolean().default(false),
});

export const createClientSchema = clientObject;
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = clientObject.partial().extend({ id: objectIdSchema });
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ============================================================
// BLOQUEAR / DESBLOQUEAR
// ============================================================

export const setClientBlockSchema = z
  .object({
    id: objectIdSchema,
    blocked: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => !d.blocked || Boolean(d.reason?.trim()), {
    message: 'Motivo obrigatório ao bloquear cliente',
    path: ['reason'],
  });
export type SetClientBlockInput = z.infer<typeof setClientBlockSchema>;

// ============================================================
// LISTAGEM / PESQUISA
// ============================================================

export const listClientsSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(30).optional(),
  blocked: z.boolean().optional(),
  active: z.boolean().optional().default(true),
  sort: z.enum(['recent', 'name', 'totalSpent', 'visits']).default('recent'),
});
export type ListClientsInput = z.infer<typeof listClientsSchema>;

// ============================================================
// AÇÕES PONTUAIS
// ============================================================

export const clientIdSchema = z.object({ id: objectIdSchema });
export type ClientIdInput = z.infer<typeof clientIdSchema>;
