// 📄 src/lib/validation/schedule.ts
/**
 * Chi Sublime — Validação: Horários do Salão
 * ============================================================
 *
 * Schemas Zod para o módulo /admin/horarios (Schedule).
 * Como nos restantes ficheiros de validação, NÃO importa
 * modelos Mongoose (enums/regex literais) para não arrastar
 * o Mongoose para o bundle de cliente via resolvers do RHF.
 */

import { z } from 'zod';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:MM)');

const isoDayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato AAAA-MM-DD)');

export const scheduleBreakSchema = z
  .object({
    start: timeString,
    end: timeString,
  })
  .refine((b) => b.start < b.end, {
    message: 'O início do intervalo tem de ser antes do fim',
  });

// ------------------------------------------------------------
// Horário semanal do salão (7 dias, type='regular')
// ------------------------------------------------------------

export const salonDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    open: z.boolean(),
    start: timeString.optional(),
    end: timeString.optional(),
    breaks: z.array(scheduleBreakSchema).max(4).default([]),
  })
  .superRefine((day, ctx) => {
    if (!day.open) return;
    if (!day.start || !day.end) {
      ctx.addIssue({ code: 'custom', message: 'Dia aberto exige hora de abertura e fecho' });
      return;
    }
    if (day.start >= day.end) {
      ctx.addIssue({ code: 'custom', message: 'A abertura tem de ser antes do fecho' });
    }
    for (const brk of day.breaks) {
      if (brk.start < day.start || brk.end > day.end) {
        ctx.addIssue({
          code: 'custom',
          message: `Intervalo (${brk.start}–${brk.end}) fora do horário de abertura`,
        });
      }
    }
  });

export const setSalonWeekSchema = z.object({
  week: z.array(salonDaySchema).length(7, 'A semana tem de ter os 7 dias'),
});

export type SetSalonWeekInput = z.infer<typeof setSalonWeekSchema>;
export type SalonDayInput = z.infer<typeof salonDaySchema>;

// ------------------------------------------------------------
// Feriados (type='holiday')
// ------------------------------------------------------------

export const addHolidaySchema = z.object({
  date: isoDayString,
  reason: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  recurringYearly: z.boolean().default(false),
});

export type AddHolidayInput = z.infer<typeof addHolidaySchema>;

// ------------------------------------------------------------
// Exceções (type='exception') — dia fechado ou horário especial
// ------------------------------------------------------------

export const upsertExceptionSchema = z
  .object({
    date: isoDayString,
    open: z.boolean(),
    start: timeString.optional(),
    end: timeString.optional(),
    reason: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
  })
  .superRefine((ex, ctx) => {
    if (!ex.open) return;
    if (!ex.start || !ex.end) {
      ctx.addIssue({
        code: 'custom',
        message: 'Horário especial exige hora de abertura e fecho',
      });
      return;
    }
    if (ex.start >= ex.end) {
      ctx.addIssue({ code: 'custom', message: 'A abertura tem de ser antes do fecho' });
    }
  });

export type UpsertExceptionInput = z.infer<typeof upsertExceptionSchema>;

// ------------------------------------------------------------
// IDs
// ------------------------------------------------------------

export const scheduleIdSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'ID inválido'),
});
