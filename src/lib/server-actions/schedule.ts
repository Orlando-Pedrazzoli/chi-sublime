// 📄 src/lib/server-actions/schedule.ts
'use server';

/**
 * Chi Sublime — Server Actions: Horários do Salão
 * ============================================================
 *
 * Gestão do modelo Schedule pelo admin (/admin/horarios):
 *  - Horário semanal (type='regular', 7 documentos upsert)
 *  - Feriados (type='holiday', com recorrência anual)
 *  - Exceções (type='exception', dia fechado ou horário especial)
 *
 * É ESTA gestão que alimenta o schedule-resolver e, por
 * consequência, a disponibilidade do site público (calendário
 * e grelha de horários do cliente).
 *
 * FIX SINCRONIZAÇÃO (jul/2026) — causa raiz do bug de
 * /reservar/horario não refletir horários novos:
 *
 *   O motor de disponibilidade faz a INTERSEÇÃO de duas fontes:
 *     1. Schedule type='regular'   → horário do SALÃO
 *     2. Staff.workingHours        → horário de CADA profissional
 *
 *   Esta action gravava só (1). Um dia novo aberto ficava com
 *   staff `enabled=false`, e horas estendidas eram cortadas por
 *   `min(salonEnd, staffEnd)` — zero slots novos no site.
 *
 *   Agora, com `syncStaff=true` (default do editor), gravar o
 *   horário semanal também alinha Staff.workingHours de TODOS
 *   os profissionais: enabled/start/end espelham o salão e as
 *   pausas individuais são preservadas (descartando apenas as
 *   que caem fora da nova janela, para passar na validação do
 *   modelo). Mesma política do scripts/fix-salon-hours.ts.
 *
 * Segue o padrão de staff.ts: requireAdminSession local,
 * Zod + fieldErrors, ok/fail, logAudit, revalidatePath, e
 * validação pesada delegada ao pre('save') do modelo com
 * tradução do erro para 'validation'.
 *
 * Datas de feriados/exceções são gravadas ancoradas ao MEIO-DIA
 * de Lisboa (combineDateAndTime), garantindo que caem sempre
 * dentro da janela do dia certo no resolver, em qualquer TZ de
 * servidor e em horário de verão/inverno.
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import {
  Schedule,
  Staff,
  WEEKDAYS,
  logAudit,
  type WeekDay,
  type WorkDayConfig,
} from '@/lib/models';
import { combineDateAndTime, toISODate } from '@/lib/utils/time-utils';
import { SALON_DEFAULT_END, SALON_DEFAULT_START } from '@/lib/constants/business';
import { ok, fail, type ActionResult } from '@/types/common';
import {
  setSalonWeekSchema,
  addHolidaySchema,
  upsertExceptionSchema,
  scheduleIdSchema,
  type SalonDayInput,
} from '@/lib/validation/schedule';

// ============================================================
// HELPERS
// ============================================================

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

function fieldErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join('.') || '_root';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Data ISO YYYY-MM-DD → Date ancorada ao meio-dia de Lisboa. */
function anchorNoon(isoDay: string): Date {
  return combineDateAndTime(new Date(`${isoDay}T12:00:00`), '12:00');
}

/** Janela [00:00, 23:59] de um dia (Lisboa) para pesquisas por data. */
function dayWindow(isoDay: string): { start: Date; end: Date } {
  const base = new Date(`${isoDay}T12:00:00`);
  return {
    start: combineDateAndTime(base, '00:00'),
    end: combineDateAndTime(base, '23:59'),
  };
}

function revalidateScheduleViews() {
  revalidatePath('/admin/horarios');
  revalidatePath('/admin/equipa');
  // A disponibilidade pública depende deste modelo
  revalidatePath('/reservar');
  revalidatePath('/reservar/horario');
}

/** dayOfWeek numérico (0=Dom … 6=Sáb) → nome usado em Staff.workingHours */
const NUMBER_TO_WEEKDAY: Record<number, WeekDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Alinha Staff.workingHours de TODOS os profissionais com o
 * horário semanal do salão acabado de gravar.
 *
 * Política (idêntica ao scripts/fix-salon-hours.ts):
 *  - Dia fechado no salão  → enabled=false (janela mantida só
 *    como placeholder, tal como o defaultWorkingHours faz)
 *  - Dia aberto no salão   → enabled=true, start/end = salão
 *  - Pausas individuais preservadas SE couberem na nova janela;
 *    as que ficarem fora são descartadas (o pre('save') do Staff
 *    rejeitaria breaks fora do horário e abortava a gravação).
 *
 * Devolve o nº de profissionais efetivamente alterados.
 */
async function syncStaffWorkingHours(week: SalonDayInput[]): Promise<number> {
  const salonByName = new Map<WeekDay, SalonDayInput>();
  for (const day of week) {
    salonByName.set(NUMBER_TO_WEEKDAY[day.dayOfWeek], day);
  }

  // Todos (ativos e inativos): um staff reativado amanhã deve
  // acordar já alinhado com o horário atual do salão.
  const allStaff = await Staff.find({});
  let changed = 0;

  for (const staff of allStaff) {
    const current = (staff.workingHours ?? {}) as Record<WeekDay, WorkDayConfig>;
    const next = {} as Record<WeekDay, WorkDayConfig>;
    let dirty = false;

    for (const dayName of WEEKDAYS) {
      const salonDay = salonByName.get(dayName);
      const cfg: WorkDayConfig = current[dayName] ?? {
        enabled: false,
        start: SALON_DEFAULT_START,
        end: SALON_DEFAULT_END,
        breaks: [],
      };

      if (!salonDay || !salonDay.open) {
        const target: WorkDayConfig = {
          enabled: false,
          start: cfg.start || SALON_DEFAULT_START,
          end: cfg.end || SALON_DEFAULT_END,
          breaks: [],
        };
        if (cfg.enabled !== target.enabled || (cfg.breaks?.length ?? 0) > 0) dirty = true;
        next[dayName] = target;
        continue;
      }

      const start = salonDay.start!;
      const end = salonDay.end!;
      const keptBreaks = (cfg.breaks ?? []).filter((b) => b.start >= start && b.end <= end);

      const target: WorkDayConfig = { enabled: true, start, end, breaks: keptBreaks };

      if (
        cfg.enabled !== true ||
        cfg.start !== start ||
        cfg.end !== end ||
        (cfg.breaks?.length ?? 0) !== keptBreaks.length
      ) {
        dirty = true;
      }
      next[dayName] = target;
    }

    if (!dirty) continue;

    staff.set('workingHours', next);
    staff.markModified('workingHours');
    await staff.save();
    changed++;
  }

  return changed;
}

// ============================================================
// HORÁRIO SEMANAL (regular)
// ============================================================

export async function setSalonWeekAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = setSalonWeekSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Horário inválido. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  try {
    for (const day of parsed.data.week) {
      // sort por updatedAt: se existirem duplicados antigos na BD,
      // editamos SEMPRE o mais recente — o mesmo que os leitores
      // (schedule-resolver e month-availability) agora escolhem.
      let doc = await Schedule.findOne({ type: 'regular', dayOfWeek: day.dayOfWeek }).sort({
        updatedAt: -1,
      });
      if (!doc) {
        doc = new Schedule({ type: 'regular', dayOfWeek: day.dayOfWeek, open: false, breaks: [] });
      }
      doc.open = day.open;
      doc.start = day.open ? day.start : undefined;
      doc.end = day.open ? day.end : undefined;
      doc.set('breaks', day.open ? day.breaks : []);
      await doc.save(); // pre('save') do modelo revalida start<end, breaks dentro do horário
    }
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    console.error('[setSalonWeekAction]', err);
    return fail('server', 'Erro ao gravar o horário semanal');
  }

  // ── FIX sincronização: alinhar o horário da equipa ──────────
  let staffChanged = 0;
  if (parsed.data.syncStaff) {
    try {
      staffChanged = await syncStaffWorkingHours(parsed.data.week);
    } catch (err) {
      // O salão JÁ foi gravado; reportar com clareza para o admin
      // poder corrigir a equipa manualmente em /admin/equipa.
      console.error('[setSalonWeekAction] syncStaffWorkingHours', err);
      const detail = err instanceof Error ? ` (${err.message})` : '';
      return fail(
        'server',
        `Horário do salão gravado, mas falhou o alinhamento da equipa${detail}. ` +
          'Verifica os horários individuais em Equipa.',
      );
    }
  }

  await logAudit({
    action: 'update',
    resource: 'schedule',
    resourceLabel: 'Horário semanal do salão',
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: parsed.data.syncStaff
      ? `Horário semanal do salão atualizado (equipa alinhada: ${staffChanged} profissional/is)`
      : 'Horário semanal do salão atualizado (sem alinhar equipa)',
    severity: 'info',
  });

  revalidateScheduleViews();
  return ok(undefined);
}

// ============================================================
// FERIADOS (holiday)
// ============================================================

export async function addHolidayAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = addHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Feriado inválido.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { date, reason, recurringYearly } = parsed.data;
  const window = dayWindow(date);

  // Duplicado no mesmo dia (a unique index só apanha igualdade exata do timestamp)
  const existing = await Schedule.findOne({
    type: 'holiday',
    date: { $gte: window.start, $lte: window.end },
  }).lean();
  if (existing) return fail('duplicate', 'Já existe um feriado nessa data');

  try {
    const doc = await Schedule.create({
      type: 'holiday',
      date: anchorNoon(date),
      open: false,
      breaks: [],
      reason: reason || 'Feriado',
      recurringYearly,
    });

    await logAudit({
      action: 'create',
      resource: 'schedule',
      resourceId: String(doc._id),
      resourceLabel: `Feriado ${date}`,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Feriado adicionado: ${date}${recurringYearly ? ' (anual)' : ''} — ${reason || 'Feriado'}`,
      severity: 'info',
    });

    revalidateScheduleViews();
    return ok({ id: String(doc._id) });
  } catch (err) {
    if (err instanceof Error && err.message.includes('E11000')) {
      return fail('duplicate', 'Já existe um feriado nessa data');
    }
    console.error('[addHolidayAction]', err);
    return fail('server', 'Erro ao adicionar feriado');
  }
}

// ============================================================
// EXCEÇÕES (exception) — dia fechado ou horário especial
// ============================================================

export async function upsertExceptionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = upsertExceptionSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Exceção inválida.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { date, open, start, end, reason } = parsed.data;
  const window = dayWindow(date);

  try {
    let doc = await Schedule.findOne({
      type: 'exception',
      date: { $gte: window.start, $lte: window.end },
    }).sort({ updatedAt: -1 });

    if (!doc) {
      doc = new Schedule({ type: 'exception', date: anchorNoon(date), breaks: [] });
    }

    doc.open = open;
    doc.start = open ? start : undefined;
    doc.end = open ? end : undefined;
    doc.set('breaks', []);
    doc.reason = reason || (open ? 'Horário especial' : 'Encerrado');

    await doc.save();

    await logAudit({
      action: 'update',
      resource: 'schedule',
      resourceId: String(doc._id),
      resourceLabel: `Exceção ${date}`,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: open
        ? `Exceção: ${date} aberto ${start}–${end} — ${doc.reason}`
        : `Exceção: ${date} encerrado — ${doc.reason}`,
      severity: 'info',
    });

    revalidateScheduleViews();
    return ok({ id: String(doc._id) });
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    console.error('[upsertExceptionAction]', err);
    return fail('server', 'Erro ao gravar a exceção');
  }
}

// ============================================================
// APAGAR feriado/exceção (hard delete — não são referenciados
// por histórico, ao contrário de clientes/serviços)
// ============================================================

export async function deleteScheduleEntryAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = scheduleIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const doc = await Schedule.findById(parsed.data.id);
  if (!doc) return fail('not_found', 'Entrada não encontrada');

  if (doc.type === 'regular') {
    return fail('validation', 'O horário semanal não pode ser apagado — edite os dias.');
  }

  const label = `${doc.type === 'holiday' ? 'Feriado' : 'Exceção'} ${doc.date ? toISODate(new Date(doc.date)) : ''}`;
  await doc.deleteOne();

  await logAudit({
    action: 'delete',
    resource: 'schedule',
    resourceId: parsed.data.id,
    resourceLabel: label,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `${label} removido`,
    severity: 'warning',
  });

  revalidateScheduleViews();
  return ok(undefined);
}
