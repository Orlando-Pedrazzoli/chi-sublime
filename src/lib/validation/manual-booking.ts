// 📄 src/lib/validation/manual-booking.ts
/**
 * Chi Sublime — Validação: Reservas manuais (admin)
 * ============================================================
 *
 * Schemas do fluxo de reserva criada pelo admin (telefone,
 * walk-in, Instagram, migração do Noona). Sem imports de
 * modelos Mongoose (regra do projeto).
 */

import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'ID inválido');
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (AAAA-MM-DD)');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)');

// ------------------------------------------------------------
// Criar reserva manual
// ------------------------------------------------------------

export const manualBookingNewClientSchema = z.object({
  name: z.string().trim().min(2, 'Nome demasiado curto').max(120),
  /** Obrigatório: é o contacto mínimo de uma reserva por telefone/balcão */
  phone: z.string().trim().min(6, 'Telefone inválido').max(30),
  email: z.string().trim().toLowerCase().email('Email inválido').max(255).optional(),
});

export const createManualBookingSchema = z
  .object({
    /** Cliente existente… */
    clientId: objectId.optional(),
    /** …ou cliente novo (um dos dois é obrigatório) */
    newClient: manualBookingNewClientSchema.optional(),

    staffId: objectId,
    serviceIds: z.array(objectId).min(1, 'Escolhe pelo menos 1 serviço').max(5),
    date: isoDay,
    time: timeString,

    source: z.enum(['phone', 'walk-in', 'instagram', 'admin']).default('phone'),
    status: z.enum(['pending', 'confirmed']).default('confirmed'),

    notes: z.string().trim().max(1000).optional(),
    internalNotes: z.string().trim().max(1000).optional(),

    /**
     * force=true salta a validação de horário (salão/staff/grelha)
     * para encaixes fora do padrão. NUNCA salta a deteção de
     * sobreposição com reservas existentes.
     */
    force: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.clientId && !data.newClient) {
      ctx.addIssue({
        code: 'custom',
        path: ['clientId'],
        message: 'Escolhe um cliente existente ou preenche os dados do cliente novo',
      });
    }
    if (data.clientId && data.newClient) {
      ctx.addIssue({
        code: 'custom',
        path: ['clientId'],
        message: 'Indica cliente existente OU cliente novo, não ambos',
      });
    }
  });

export type CreateManualBookingInput = z.infer<typeof createManualBookingSchema>;

// ------------------------------------------------------------
// Cancelar (admin) — sem janela de 24h, motivo obrigatório
// ------------------------------------------------------------

export const adminCancelBookingSchema = z.object({
  id: objectId,
  reason: z.string().trim().min(2, 'Indica o motivo').max(500),
});

export type AdminCancelBookingInput = z.infer<typeof adminCancelBookingSchema>;

// ------------------------------------------------------------
// Mudar status (confirmar / iniciar / concluir / falta)
// Cancelamento NÃO passa por aqui — usa adminCancelBookingAction
// (o modelo exige motivo + cancelledBy).
// ------------------------------------------------------------

export const updateBookingStatusSchema = z.object({
  id: objectId,
  status: z.enum(['confirmed', 'in-progress', 'completed', 'no-show']),
});

export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
