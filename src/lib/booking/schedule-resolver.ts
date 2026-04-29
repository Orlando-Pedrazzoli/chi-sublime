/**
 * Chi Sublime — Schedule Resolver
 * ============================================================
 *
 * Resolve qual o horario do SALAO para uma data especifica.
 *
 * Hierarquia de prioridade (alta -> baixa):
 *   1. Schedule type="exception" com data exata
 *   2. Schedule type="holiday" (com recurringYearly aplicado)
 *   3. Schedule type="regular" do dia da semana
 *
 * Output normalizado para o algoritmo de availability nao se
 * preocupar com qual o tipo de entry — recebe sempre uma
 * estrutura uniforme.
 */

import { Schedule, type ISchedule } from '@/lib/models';
import { getWeekDay, toISODate, type WeekDay } from '@/lib/utils/time-utils';

const WEEKDAY_TO_NUMBER: Record<WeekDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type ResolvedSchedule = {
  /** Salao esta aberto neste dia? */
  open: boolean;
  /** Hora abertura HH:MM (so se open=true) */
  start?: string;
  /** Hora fecho HH:MM (so se open=true) */
  end?: string;
  /** Pausas durante o dia */
  breaks: { start: string; end: string }[];
  /** Razao se fechado (ex: "holiday", "closed") */
  reason?: 'holiday' | 'closed' | 'exception-closed';
  /** Detalhe humanamente legivel */
  reasonDetail?: string;
  /** De que tipo de entry veio a resposta (debugging) */
  source: 'regular' | 'holiday' | 'exception';
};

/**
 * Resolve o horario do salao para uma data especifica.
 * Aplica hierarquia: exception > holiday > regular.
 *
 * @param date Data alvo (qualquer hora, so o dia interessa)
 * @returns Estrutura uniforme com { open, start, end, breaks, ... }
 */
export async function resolveSchedule(date: Date): Promise<ResolvedSchedule> {
  const isoDate = toISODate(date);
  const weekday = getWeekDay(date);
  const dayOfWeek = WEEKDAY_TO_NUMBER[weekday];

  // PASSO 1 — Procurar exception para esta data exata
  const exception = await findExceptionForDate(isoDate);
  if (exception) {
    if (!exception.open) {
      return {
        open: false,
        breaks: [],
        reason: 'exception-closed',
        reasonDetail: exception.reason || 'Encerrado nesta data',
        source: 'exception',
      };
    }
    return {
      open: true,
      start: exception.start,
      end: exception.end,
      breaks: exception.breaks ?? [],
      source: 'exception',
    };
  }

  // PASSO 2 — Procurar holiday (com recurringYearly aplicado)
  const holiday = await findHolidayForDate(isoDate);
  if (holiday) {
    return {
      open: false,
      breaks: [],
      reason: 'holiday',
      reasonDetail: holiday.reason || 'Feriado',
      source: 'holiday',
    };
  }

  // PASSO 3 — Usar regular do dia da semana
  const regular = await Schedule.findOne({
    type: 'regular',
    dayOfWeek,
  }).lean();

  if (!regular || !regular.open) {
    return {
      open: false,
      breaks: [],
      reason: 'closed',
      reasonDetail: 'Encerrado neste dia da semana',
      source: 'regular',
    };
  }

  return {
    open: true,
    start: regular.start,
    end: regular.end,
    breaks: regular.breaks ?? [],
    source: 'regular',
  };
}

/**
 * Procura uma exception para a data exata.
 * Compara so a parte da data, ignora hora.
 */
async function findExceptionForDate(isoDate: string): Promise<ISchedule | null> {
  // Buscar exceptions que correspondam ao dia especifico (start..end)
  const startOfDay = new Date(`${isoDate}T00:00:00Z`);
  const endOfDay = new Date(`${isoDate}T23:59:59Z`);

  return Schedule.findOne({
    type: 'exception',
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();
}

/**
 * Procura um holiday para a data.
 * Suporta recurringYearly: se holiday for de 25 dez 2025 e
 * recurringYearly=true, aplica-se a 25 dez de qualquer ano.
 */
async function findHolidayForDate(isoDate: string): Promise<ISchedule | null> {
  // ISO format: "YYYY-MM-DD"
  const [, monthStr, dayStr] = isoDate.split('-');
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Procurar todos os holidays
  const holidays = await Schedule.find({ type: 'holiday' }).lean();

  for (const h of holidays) {
    if (!h.date) continue;
    const hDate = new Date(h.date);
    const hMonth = hDate.getUTCMonth() + 1;
    const hDay = hDate.getUTCDate();

    // Match exato (mesmo dia/mes/ano)
    if (toISODate(hDate) === isoDate) {
      return h;
    }

    // Match recurringYearly (mesmo dia e mes)
    if (h.recurringYearly && hMonth === month && hDay === day) {
      return h;
    }
  }

  return null;
}
