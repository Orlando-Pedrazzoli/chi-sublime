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

import { formatInTimeZone } from 'date-fns-tz';
import { Schedule, type ISchedule } from '@/lib/models';
import {
  combineDateAndTime,
  getWeekDay,
  SALON_TIMEZONE,
  toISODate,
  type WeekDay,
} from '@/lib/utils/time-utils';

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
  const weekday = getWeekDay(date);
  const dayOfWeek = WEEKDAY_TO_NUMBER[weekday];

  // PASSO 1 — Procurar exception para esta data exata
  const exception = await findExceptionForDate(date);
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
  const holiday = await findHolidayForDate(date);
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
 *
 * Os limites do dia são calculados no fuso de Lisboa (combineDateAndTime),
 * não com literais "...Z" (UTC). Assim, uma exceção gravada à meia-noite
 * local no horário de verão (= 23:00Z do dia anterior) continua a cair
 * dentro da janela correta e não é ignorada.
 */
async function findExceptionForDate(date: Date): Promise<ISchedule | null> {
  const startOfDay = combineDateAndTime(date, '00:00');
  const endOfDay = combineDateAndTime(date, '23:59');

  return Schedule.findOne({
    type: 'exception',
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();
}

/**
 * Procura um holiday para a data.
 * Suporta recurringYearly: se holiday for de 25 dez e recurringYearly=true,
 * aplica-se a 25 dez de qualquer ano.
 *
 * CRÍTICO: o mês/dia do feriado gravado são extraídos no fuso de Lisboa
 * (formatInTimeZone), NUNCA com getUTC*(). Um feriado gravado em horário
 * de verão (ex: 10/jun às 00:00 Lisboa = 09/jun 23:00Z) lido com getUTCDate()
 * devolveria dia 9 e o salão apareceria aberto no feriado no ano seguinte.
 */
async function findHolidayForDate(date: Date): Promise<ISchedule | null> {
  const isoDate = toISODate(date);
  const month = formatInTimeZone(date, SALON_TIMEZONE, 'MM');
  const day = formatInTimeZone(date, SALON_TIMEZONE, 'dd');

  const holidays = await Schedule.find({ type: 'holiday' }).lean();

  for (const h of holidays) {
    if (!h.date) continue;
    const hDate = new Date(h.date);

    // Match exato (mesmo dia/mês/ano, no fuso de Lisboa)
    if (toISODate(hDate) === isoDate) {
      return h;
    }

    // Match recurringYearly (mesmo dia e mês, no fuso de Lisboa)
    if (h.recurringYearly) {
      const hMonth = formatInTimeZone(hDate, SALON_TIMEZONE, 'MM');
      const hDay = formatInTimeZone(hDate, SALON_TIMEZONE, 'dd');
      if (hMonth === month && hDay === day) {
        return h;
      }
    }
  }

  return null;
}
