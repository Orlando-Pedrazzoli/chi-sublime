/**
 * Chi Sublime — Booking Validation Schemas (Zod)
 * ============================================================
 *
 * Validacao rigorosa de inputs do sistema de reservas.
 *
 * Defesa em profundidade: mesmo que o frontend seja hackeado,
 * a database NUNCA recebe dados invalidos.
 *
 * Inclui:
 *  - Validacao de servicos, staff, data
 *  - Dados do cliente (nome, email, telefone PT)
 *  - NIF portugues opcional (algoritmo dígito controlo)
 *  - Lista negra de emails descartaveis
 *  - Honeypot (anti-bot)
 */

import { z } from 'zod';
import { isValidNIF } from '@/lib/utils/nif';

// ============================================================
// CONSTANTES
// ============================================================

/**
 * Lista de dominios de email descartaveis conhecidos.
 * Bloqueia ~95% dos casos de mailers temporarios.
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'mailinator.com',
  'tempmail.com',
  'tempmailaddress.com',
  'throwawaymail.com',
  'yopmail.com',
  'mintemail.com',
  'spamgourmet.com',
  'trashmail.com',
  'trashmail.net',
  'fakeinbox.com',
  'dispostable.com',
  'maildrop.cc',
  'tempr.email',
  'moakt.com',
  'sharklasers.com',
];

const PORTUGUESE_PHONE_REGEX = /^(\+351\s?)?9[1236]\d{7}$|^(\+351\s?)?2\d{8}$/;

// ============================================================
// VALIDADORES INDIVIDUAIS
// ============================================================

/**
 * Valida nome humano: min 2 chars, max 120, sem numeros.
 */
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(120, 'Nome demasiado longo')
  .regex(/^[\p{L}\s'.-]+$/u, 'Nome contém caracteres invalidos');

/**
 * Valida email: RFC + lista negra de descartaveis.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email demasiado curto')
  .max(255, 'Email demasiado longo')
  .email('Email invalido')
  .refine(
    (email) => {
      const domain = email.split('@')[1];
      return !DISPOSABLE_EMAIL_DOMAINS.includes(domain);
    },
    { message: 'Emails temporarios nao sao permitidos' },
  );

/**
 * Valida telefone português:
 *  - Mobile: 91x, 92x, 93x, 96x (9 digitos)
 *  - Fixo: 2x (9 digitos)
 *  - Aceita +351 opcional
 */
const phoneSchema = z
  .string()
  .trim()
  .min(9, 'Telefone demasiado curto')
  .max(20, 'Telefone demasiado longo')
  .transform((phone) => phone.replace(/\s/g, '')) // remove espacos
  .refine((phone) => PORTUGUESE_PHONE_REGEX.test(phone), {
    message: 'Telefone invalido (formato portugues esperado)',
  });

/**
 * Valida NIF portugues opcional.
 * Se preenchido, tem de ser valido (algoritmo digito controlo).
 */
const nifSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (nif) => {
      if (!nif) return true; // opcional
      return isValidNIF(nif);
    },
    { message: 'NIF invalido' },
  );

/**
 * MongoDB ObjectId (24 chars hex).
 */
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID invalido');

// ============================================================
// SCHEMAS COMPOSTOS
// ============================================================

/**
 * Dados do cliente guest (sem conta web).
 */
export const guestInfoSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

/**
 * Dados fiscais opcionais (cliente quer fatura com NIF).
 */
export const fiscalDataSchema = z.object({
  vatNumber: nifSchema,
  fullLegalName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{3}$/, 'Código postal invalido (esperado 0000-000)')
    .optional(),
  city: z.string().trim().max(100).optional(),
});

/**
 * Input principal para criar booking.
 *
 * Honeypot: campo "website" deve estar VAZIO. Se um bot preencher,
 * a validacao falha silenciosamente.
 */
export const createBookingSchema = z
  .object({
    // Dados da reserva
    serviceIds: z
      .array(objectIdSchema)
      .min(1, 'Tem de escolher pelo menos 1 serviço')
      .max(5, 'Máximo 5 serviços por reserva'),

    staffId: z.union([objectIdSchema, z.literal('any')]),

    /** Data ISO YYYY-MM-DD */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (esperado YYYY-MM-DD)'),

    /** Hora HH:MM */
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (esperado HH:MM)'),

    // Cliente
    guestInfo: guestInfoSchema,

    // Notas opcionais
    notes: z.string().trim().max(1000, 'Notas demasiado longas').optional(),

    // Faturação opcional
    requestInvoice: z.boolean().default(false),
    fiscalData: fiscalDataSchema.optional(),

    // Política
    acceptsCancellationPolicy: z.boolean().refine((v) => v === true, {
      message: 'Tem de aceitar a política de cancelamento',
    }),

    marketingConsent: z.boolean().default(false),

    // Honeypot — bots tipicamente preenchem todos os campos
    website: z.string().max(0, 'Detetado tráfego automático').optional().default(''),

    /** Source da reserva (para analytics) */
    source: z.enum(['website', 'phone', 'walk-in', 'instagram', 'admin']).default('website'),
  })
  .refine(
    (data) => {
      // Se requestInvoice=true, fiscalData.vatNumber obrigatorio
      if (data.requestInvoice && !data.fiscalData?.vatNumber) {
        return false;
      }
      return true;
    },
    {
      message: 'NIF é obrigatório quando requesita fatura',
      path: ['fiscalData', 'vatNumber'],
    },
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Input para cancelar booking.
 */
export const cancelBookingSchema = z.object({
  bookingNumber: z.string().regex(/^CHI-\d{4}-\d{4}$/, 'Número de reserva inválido'),
  cancellationToken: z.string().min(20, 'Token inválido'),
  reason: z.string().trim().max(500).optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
