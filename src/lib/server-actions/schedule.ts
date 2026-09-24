// ðŸ“„ src/lib/server-actions/schedule.ts
'use server';

/**
 * Chi Sublime â€” Server Actions: HorÃ¡rios do SalÃ£o
 * ============================================================
 *
 * GestÃ£o do modelo Schedule pelo admin (/admin/horarios):
 *  - HorÃ¡rio semanal (type='regular', 7 documentos upsert)
 *  - Feriados (type='holiday', com recorrÃªncia anual)
 *  - ExceÃ§Ãµes (type='exception', dia fechado ou horÃ¡rio especial)
 *
 * Ã‰ ESTA gestÃ£o que alimenta o schedule-resolver e, por
 * consequÃªncia, a disponibilidade do site pÃºblico (calendÃ¡rio
 * e grelha de horÃ¡rios do cliente).
 *
 * FIX SINCRONIZAÃ‡ÃƒO (jul/2026) â€” causa raiz do bug de
 * /marcacoes/horario nÃ£o refletir horÃ¡rios novos:
 *
 *   O motor de disponibilidade faz a INTERSEÃ‡ÃƒO de duas fontes:
 *     1. Schedule type='regular'   â†’ horÃ¡rio do SALÃƒO
 *     2. Staff.workingHours        â†’ horÃ¡rio de CADA profissional
 *
 *   Esta action gravava sÃ³ (1). Um dia novo aberto ficava com
 *   staff `enabled=false`, e horas estendidas eram cortadas por
 *   `min(salonEnd, staffEnd)` â€” zero slots novos no site.
 *
 *   Agora, com `syncStaff=true` (default do editor), gravar o
 *   horÃ¡rio semanal tambÃ©m alinha Staff.workingHours de TODOS
 *   os profissionais: enabled/start/end espelham o salÃ£o e as
 *   pausas individuais sÃ£o preservadas (descartando apenas as
 *   que caem fora da nova janela, para passar na validaÃ§Ã£o do
 *   modelo). Mesma polÃ­tica do scripts/fix-salon-hours.ts.
 *
 * Segue o padrÃ£o de staff.ts: requireAdminSession local,
 * Zod + fieldErrors, ok/fail, logAudit, revalidatePath, e
 * validaÃ§Ã£o pesada delegada ao pre('save') do modelo com
 * traduÃ§Ã£o do erro para 'validation'.
 *
 * Datas de feriados/exceÃ§Ãµes sÃ£o gravadas ancoradas ao MEIO-DIA
 * de Lisboa (combineDateAndTime), garantindo que caem sempre
 * dentro da janela do dia certo no resolver, em qualquer TZ de
 * servidor e em horÃ¡rio de verÃ£o/inverno.
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

/** Data ISO YYYY-MM-DD â†’ Date ancorada ao meio-dia de Lisboa. */
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
  // A disponibilidade pÃºblica depende deste modelo
  revalidatePath('/marcacoes');
  revalidatePath('/marcacoes/horario');
}

/** dayOfWeek numÃ©rico (0=Dom â€¦ 6=SÃ¡b) â†’ nome usado em Staff.workingHours */
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
 * horÃ¡rio semanal do salÃ£o acabado de gravar.
 *
 * PolÃ­tica (idÃªntica ao scripts/fix-salon-hours.ts):
 *  - Dia fechado no salÃ£o  â†’ enabled=false (janela mantida sÃ³
 *    como placeholder, tal como o defaultWorkingHours faz)
 *  - Dia aberto no salÃ£o   â†’ enabled=true, start/end = salÃ£o
 *  - Pausas individuais preservadas SE couberem na nova janela;
 *    as que ficarem fora sÃ£o descartadas (o pre('save') do Staff
 *    rejeitaria breaks fora do horÃ¡rio e abortava a gravaÃ§Ã£o).
 *
 * Devolve o nÂº de profissionais efetivamente alterados.
 */
async function syncStaffWorkingHours(week: SalonDayInput[]): Promise<number> {
  const salonByName = new Map<WeekDay, SalonDayInput>();
  for (const day of week) {
    salonByName.set(NUMBER_TO_WEEKDAY[day.dayOfWeek], day);
  }

  // Todos (ativos e inativos): um staff reativado amanhÃ£ deve
  // acordar jÃ¡ alinhado com o horÃ¡rio atual do salÃ£o.
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
// HORÃRIO SEMANAL (regular)
// ============================================================

export async function setSalonWeekAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = setSalonWeekSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'HorÃ¡rio invÃ¡lido. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  try {
    for (const day of parsed.data.week) {
      // sort por updatedAt: se existirem duplicados antigos na BD,
      // editamos SEMPRE o mais recente â€” o mesmo que os leitores
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
      await doc.save(); // pre('save') do modelo revalida start<end, breaks dentro do horÃ¡rio
    }
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    console.error('[setSalonWeekAction]', err);
    return fail('server', 'Erro ao gravar o horÃ¡rio semanal');
  }

  // â”€â”€ FIX sincronizaÃ§Ã£o: alinhar o horÃ¡rio da equipa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let staffChanged = 0;
  if (parsed.data.syncStaff) {
    try {
      staffChanged = await syncStaffWorkingHours(parsed.data.week);
    } catch (err) {
      // O salÃ£o JÃ foi gravado; reportar com clareza para o admin
      // poder corrigir a equipa manualmente em /admin/equipa.
      console.error('[setSalonWeekAction] syncStaffWorkingHours', err);
      const detail = err instanceof Error ? ` (${err.message})` : '';
      return fail(
        'server',
        `HorÃ¡rio do salÃ£o gravado, mas falhou o alinhamento da equipa${detail}. ` +
          'Verifica os horÃ¡rios individuais em Equipa.',
      );
    }
  }

  await logAudit({
    action: 'update',
    resource: 'schedule',
    resourceLabel: 'HorÃ¡rio semanal do salÃ£o',
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: parsed.data.syncStaff
      ? `HorÃ¡rio semanal do salÃ£o atualizado (equipa alinhada: ${staffChanged} profissional/is)`
      : 'HorÃ¡rio semanal do salÃ£o atualizado (sem alinhar equipa)',
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
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = addHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Feriado invÃ¡lido.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { date, reason, recurringYearly } = parsed.data;
  const window = dayWindow(date);

  // Duplicado no mesmo dia (a unique index sÃ³ apanha igualdade exata do timestamp)
  const existing = await Schedule.findOne({
    type: 'holiday',
    date: { $gte: window.start, $lte: window.end },
  }).lean();
  if (existing) return fail('duplicate', 'JÃ¡ existe um feriado nessa data');

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
      message: `Feriado adicionado: ${date}${recurringYearly ? ' (anual)' : ''} â€” ${reason || 'Feriado'}`,
      severity: 'info',
    });

    revalidateScheduleViews();
    return ok({ id: String(doc._id) });
  } catch (err) {
    if (err instanceof Error && err.message.includes('E11000')) {
      return fail('duplicate', 'JÃ¡ existe um feriado nessa data');
    }
    console.error('[addHolidayAction]', err);
    return fail('server', 'Erro ao adicionar feriado');
  }
}

// ============================================================
// EXCEÃ‡Ã•ES (exception) â€” dia fechado ou horÃ¡rio especial
// ============================================================

export async function upsertExceptionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = upsertExceptionSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'ExceÃ§Ã£o invÃ¡lida.', fieldErrors(parsed.error));
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
    doc.reason = reason || (open ? 'HorÃ¡rio especial' : 'Encerrado');

    await doc.save();

    await logAudit({
      action: 'update',
      resource: 'schedule',
      resourceId: String(doc._id),
      resourceLabel: `ExceÃ§Ã£o ${date}`,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: open
        ? `ExceÃ§Ã£o: ${date} aberto ${start}â€“${end} â€” ${doc.reason}`
        : `ExceÃ§Ã£o: ${date} encerrado â€” ${doc.reason}`,
      severity: 'info',
    });

    revalidateScheduleViews();
    return ok({ id: String(doc._id) });
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    console.error('[upsertExceptionAction]', err);
    return fail('server', 'Erro ao gravar a exceÃ§Ã£o');
  }
}

// ============================================================
// APAGAR feriado/exceÃ§Ã£o (hard delete â€” nÃ£o sÃ£o referenciados
// por histÃ³rico, ao contrÃ¡rio de clientes/serviÃ§os)
// ============================================================

export async function deleteScheduleEntryAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = scheduleIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID invÃ¡lido.');

  await connectDB();

  const doc = await Schedule.findById(parsed.data.id);
  if (!doc) return fail('not_found', 'Entrada nÃ£o encontrada');

  if (doc.type === 'regular') {
    return fail('validation', 'O horÃ¡rio semanal nÃ£o pode ser apagado â€” edite os dias.');
  }

  const label = `${doc.type === 'holiday' ? 'Feriado' : 'ExceÃ§Ã£o'} ${doc.date ? toISODate(new Date(doc.date)) : ''}`;
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
