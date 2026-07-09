/**
 * Chi Sublime — Staff Validation Schemas (Zod)
 * ============================================================
 *
 * Contratos de input para o CRUD da equipa, mais os editores de
 * horário semanal (workingHours) e de férias (vacations), que
 * alimentam o cálculo de disponibilidade.
 *
 * Enums inline (não importar de @/lib/models — ver shared.ts).
 * As 7 chaves de workingHours espelham WEEKDAYS em models/Staff.ts.
 */

import { z } from 'zod';
import {
  objectIdSchema,
  humanNameSchema,
  emailSchema,
  ptPhoneSchema,
  timeSchema,
  paginationSchema,
} from './shared';

// ------------------------------------------------------------
// Horário semanal
// ------------------------------------------------------------

const workBreakSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((b) => b.start < b.end, {
    message: 'Início do intervalo tem de ser antes do fim',
    path: ['end'],
  });

const workDaySchema = z
  .object({
    enabled: z.boolean().default(false),
    start: timeSchema.default('10:00'),
    end: timeSchema.default('19:00'),
    breaks: z.array(workBreakSchema).max(4).default([]),
  })
  .refine((d) => !d.enabled || d.start < d.end, {
    message: 'Hora de abertura tem de ser antes do fecho',
    path: ['end'],
  });

/** Record<WeekDay, WorkDayConfig> — 7 chaves fixas. */
const workingHoursSchema = z.object({
  monday: workDaySchema,
  tuesday: workDaySchema,
  wednesday: workDaySchema,
  thursday: workDaySchema,
  friday: workDaySchema,
  saturday: workDaySchema,
  sunday: workDaySchema,
});
export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

// ------------------------------------------------------------
// Férias
// ------------------------------------------------------------

const vacationSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.to >= v.from, {
    message: 'Data de fim não pode ser anterior à de início',
    path: ['to'],
  });

// ------------------------------------------------------------
// i18n
// ------------------------------------------------------------

const roleSchema = z.object({
  pt: z.string().trim().min(2, 'Função (PT) obrigatória').max(80),
  en: z.string().trim().max(80).optional(),
});

const bioLikeSchema = z
  .object({
    pt: z.string().trim().max(1000).optional(),
    en: z.string().trim().max(1000).optional(),
  })
  .optional();

// ============================================================
// STAFF — CREATE / UPDATE
// ============================================================

const staffObject = z.object({
  name: humanNameSchema.max(100, 'Nome demasiado longo'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido')
    .optional(),
  role: roleSchema,
  bio: bioLikeSchema,
  specialty: z
    .object({
      pt: z.string().trim().max(200).optional(),
      en: z.string().trim().max(200).optional(),
    })
    .optional(),
  photo: z.string().trim().max(500).optional(),
  specialties: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  email: emailSchema.optional(),
  phone: ptPhoneSchema.optional(),
  workingHours: workingHoursSchema.optional(),
  vacations: z.array(vacationSchema).max(50).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const createStaffSchema = staffObject;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = staffObject.partial().extend({ id: objectIdSchema });
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// ============================================================
// STAFF — EDITORES DEDICADOS
// ============================================================

export const setWorkingHoursSchema = z.object({
  id: objectIdSchema,
  workingHours: workingHoursSchema,
});
export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;

export const setVacationsSchema = z.object({
  id: objectIdSchema,
  vacations: z.array(vacationSchema).max(50),
});
export type SetVacationsInput = z.infer<typeof setVacationsSchema>;

// ============================================================
// STAFF — LISTAGEM / AÇÕES
// ============================================================

export const listStaffSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  active: z.boolean().optional(),
});
export type ListStaffInput = z.infer<typeof listStaffSchema>;

export const staffIdSchema = z.object({ id: objectIdSchema });
export type StaffIdInput = z.infer<typeof staffIdSchema>;
