/**
 * Chi Sublime — Primitivos de validação partilhados (Zod)
 * ============================================================
 *
 * Blocos reutilizados pelos schemas de client/service/staff/
 * transaction/invoice. Mantê-los aqui evita divergência entre os
 * vários contratos (ex: regra do telefone PT ou do NIF num sítio só).
 *
 * IMPORTANTE — segurança de bundle:
 *   Este ficheiro (e todos os validation/*) NÃO importa de
 *   "@/lib/models". Os schemas são consumidos por Client Components
 *   (react-hook-form resolvers), e importar os models arrastaria o
 *   Mongoose para o bundle do browser. Por isso os enums são literais
 *   inline — têm de espelhar os enums dos models manualmente.
 *
 * Unidade monetária canónica do servidor: CÊNTIMOS (integer).
 * Os inputs de dinheiro chegam já em cêntimos (o CurrencyInput no
 * frontend converte euros → cêntimos antes de submeter).
 */

import { z } from 'zod';
import { isValidNIF } from '@/lib/utils/nif';

// ============================================================
// Identificadores / strings base
// ============================================================

/** MongoDB ObjectId (24 chars hex). */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

/** Nome humano: 2–120 chars, letras/espaços/apóstrofos, sem dígitos. */
export const humanNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(120, 'Nome demasiado longo')
  .regex(/^[\p{L}\s'.-]+$/u, 'Nome contém caracteres inválidos');

/** Email RFC-ish, normalizado para minúsculas. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email demasiado curto')
  .max(255, 'Email demasiado longo')
  .email('Email inválido');

const PORTUGUESE_PHONE_REGEX = /^(\+351\s?)?9[1236]\d{7}$|^(\+351\s?)?2\d{8}$/;

/** Telefone português (móvel 91/92/93/96 ou fixo 2x), +351 opcional. */
export const ptPhoneSchema = z
  .string()
  .trim()
  .min(9, 'Telefone demasiado curto')
  .max(20, 'Telefone demasiado longo')
  .transform((phone) => phone.replace(/\s/g, ''))
  .refine((phone) => PORTUGUESE_PHONE_REGEX.test(phone), {
    message: 'Telefone inválido (formato português esperado)',
  });

/** NIF português opcional — se preenchido, tem de passar o dígito de controlo. */
export const nifOptionalSchema = z
  .string()
  .trim()
  .optional()
  .refine((nif) => !nif || isValidNIF(nif), { message: 'NIF inválido' });

/** Código postal PT no formato 0000-000. */
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{3}$/, 'Código postal inválido (esperado 0000-000)');

/** Cor hexadecimal #RRGGBB. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (esperado #RRGGBB)');

/** Hora HH:MM (24h). */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (esperado HH:MM)');

/** Data ISO YYYY-MM-DD. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (esperado YYYY-MM-DD)');

// ============================================================
// Dinheiro (cêntimos)
// ============================================================

/** Valor monetário em cêntimos: integer >= 0. */
export const centsSchema = z
  .number()
  .int('Valor tem de ser em cêntimos (integer)')
  .min(0, 'Valor não pode ser negativo');

/** Taxa de IVA em percentagem (0–100). Default 23 (regime geral PT). */
export const vatRateSchema = z
  .number()
  .int('Taxa de IVA inválida')
  .min(0, 'Taxa de IVA inválida')
  .max(100, 'Taxa de IVA inválida')
  .default(23);

/** Percentagem de desconto 0–100. */
export const discountPercentSchema = z
  .number()
  .min(0, 'Desconto inválido')
  .max(100, 'Desconto máximo 100%');

// ============================================================
// Paginação
// ============================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
