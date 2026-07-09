/**
 * Chi Sublime — Service & Category Validation Schemas (Zod)
 * ============================================================
 *
 * Contratos de input para o CRUD de serviços e das categorias de
 * serviço. Preços e depósitos em CÊNTIMOS (ver shared.ts).
 *
 * A regra de negócio "requiresDeposit ⇒ depositAmount > 0" é
 * validada aqui (create) e reforçada no pre-save do model.
 */

import { z } from 'zod';
import {
  objectIdSchema,
  centsSchema,
  vatRateSchema,
  hexColorSchema,
  paginationSchema,
} from './shared';

// ------------------------------------------------------------
// Blocos i18n
// ------------------------------------------------------------

const serviceNameSchema = z.object({
  pt: z.string().trim().min(2, 'Nome (PT) obrigatório').max(120),
  en: z.string().trim().max(120).optional(),
});

const serviceDescriptionSchema = z
  .object({
    pt: z.string().trim().max(1000).optional(),
    en: z.string().trim().max(1000).optional(),
  })
  .optional();

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Slug inválido (apenas a-z, 0-9 e hífen)')
  .optional();

// ============================================================
// SERVICE — CREATE / UPDATE
// ============================================================

const serviceObject = z.object({
  categoryId: objectIdSchema,
  name: serviceNameSchema,
  slug: slugSchema,
  description: serviceDescriptionSchema,
  duration: z
    .number()
    .int('Duração em minutos (integer)')
    .min(5, 'Duração mínima 5 min')
    .max(600, 'Duração máxima 600 min'),
  price: centsSchema,
  vatRate: vatRateSchema,
  bufferAfter: z.number().int().min(0).max(120, 'Buffer máximo 120 min').default(0),
  staffIds: z.array(objectIdSchema).max(50).default([]),
  image: z.string().trim().max(500).optional(),
  requiresDeposit: z.boolean().default(false),
  depositAmount: centsSchema.default(0),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  popular: z.boolean().default(false),
});

export const createServiceSchema = serviceObject.refine(
  (d) => !d.requiresDeposit || d.depositAmount > 0,
  { message: 'Depósito tem de ser maior que 0 quando é obrigatório', path: ['depositAmount'] },
);
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = serviceObject.partial().extend({ id: objectIdSchema });
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ============================================================
// SERVICE — LISTAGEM / AÇÕES
// ============================================================

export const listServicesSchema = paginationSchema.extend({
  categoryId: objectIdSchema.optional(),
  search: z.string().trim().max(120).optional(),
  active: z.boolean().optional(),
  popular: z.boolean().optional(),
});
export type ListServicesInput = z.infer<typeof listServicesSchema>;

export const serviceIdSchema = z.object({ id: objectIdSchema });
export type ServiceIdInput = z.infer<typeof serviceIdSchema>;

/** Atualização de preço em massa (aumento/desconto % ou valor fixo). */
export const bulkPriceUpdateSchema = z
  .object({
    categoryId: objectIdSchema.optional(),
    serviceIds: z.array(objectIdSchema).optional(),
    mode: z.enum(['percent', 'fixed']),
    /** percent: +/- %, fixed: novo preço em cêntimos */
    value: z.number(),
    roundTo: z.number().int().min(1).default(1),
  })
  .refine((d) => d.mode !== 'fixed' || (Number.isInteger(d.value) && d.value >= 0), {
    message: 'Preço fixo tem de ser em cêntimos (integer >= 0)',
    path: ['value'],
  });
export type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateSchema>;

// ============================================================
// CATEGORY (categorias de serviço) — CREATE / UPDATE
// ============================================================

const categoryObject = z.object({
  name: z.object({
    pt: z.string().trim().min(2, 'Nome (PT) obrigatório').max(80),
    en: z.string().trim().max(80).optional(),
  }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido')
    .optional(),
  description: z
    .object({
      pt: z.string().trim().max(500).optional(),
      en: z.string().trim().max(500).optional(),
    })
    .optional(),
  icon: z.string().trim().max(60).optional(),
  color: hexColorSchema.optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const createCategorySchema = categoryObject;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = categoryObject.partial().extend({ id: objectIdSchema });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdSchema = z.object({ id: objectIdSchema });
export type CategoryIdInput = z.infer<typeof categoryIdSchema>;
