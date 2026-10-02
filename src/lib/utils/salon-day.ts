// 📄 src/lib/utils/salon-day.ts
/**
 * Chi Sublime — Dias de calendário do salão (Europe/Lisbon)
 * ============================================================
 *
 * ÚNICA forma correta de responder a "em que dia cai esta marcação?"
 * e de fazer contas com dias (semana, dia seguinte, hoje).
 *
 * PORQUÊ ESTE MÓDULO EXISTE (out. 2026):
 * A vista de semana da agenda calculava a chave de cada coluna com
 * `date.toISOString().slice(0, 10)` sobre uma Date à meia-noite LOCAL.
 * `toISOString()` devolve sempre UTC — e meia-noite em Lisboa no
 * horário de verão é 23:00 UTC do dia ANTERIOR. Resultado: todas as
 * colunas ficavam com a chave do dia anterior e uma marcação de
 * sábado aparecia na coluna de domingo.
 *
 * REGRAS:
 *  - Um "dia" é sempre uma string YYYY-MM-DD. Nunca uma Date.
 *  - As contas com dias fazem-se em UTC puro (Date.UTC), que não tem
 *    horário de verão — somar 1 dia é sempre somar 1 dia.
 *  - Converter um instante (Date) em dia/hora passa SEMPRE pelo fuso
 *    do salão, nunca pelo fuso do browser nem do servidor.
 *  - NUNCA usar toISOString() para obter o dia de um instante.
 *
 * Módulo puro (só Intl): seguro no servidor e em Client Components.
 */

import { SALON_TIMEZONE, type WeekDayIndex } from '@/lib/constants/business';

const ISO_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const PARTS_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: SALON_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function salonParts(instant: Date | string | number) {
  const parts = PARTS_FMT.formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Converte YYYY-MM-DD num instante UTC "neutro" (meio-dia) só para contas. */
function toUtcNoon(iso: string): Date {
  const match = ISO_DAY_RE.exec(iso);
  if (!match) throw new Error(`Dia inválido: "${iso}" (esperado YYYY-MM-DD)`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}

function fromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** É uma string YYYY-MM-DD que corresponde a um dia real? */
export function isISODay(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DAY_RE.test(value)) return false;
  return fromUtc(toUtcNoon(value)) === value; // rejeita 2026-02-31
}

/**
 * Dia de calendário (YYYY-MM-DD) de um instante, NO FUSO DO SALÃO.
 * Sem argumento devolve hoje em Lisboa.
 *
 * @example
 * salonDayISO(new Date('2026-10-03T10:00:00Z')) -> '2026-10-03'
 * salonDayISO(new Date('2026-10-02T23:30:00Z')) -> '2026-10-03' (00:30 em Lisboa)
 */
export function salonDayISO(instant: Date | string | number = new Date()): string {
  const { year, month, day } = salonParts(instant);
  return `${year}-${month}-${day}`;
}

/** Minutos desde a meia-noite de um instante, no fuso do salão. */
export function salonMinutesOfDay(instant: Date | string | number): number {
  const { hour, minute } = salonParts(instant);
  return hour * 60 + minute;
}

/** Soma (ou subtrai) dias a um YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const date = toUtcNoon(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Dia da semana de um YYYY-MM-DD (0 = Domingo … 6 = Sábado). */
export function weekdayOfISO(iso: string): WeekDayIndex {
  return toUtcNoon(iso).getUTCDay() as WeekDayIndex;
}

/** Segunda-feira da semana que contém o dia indicado. */
export function startOfWeekISO(iso: string): string {
  const weekday = weekdayOfISO(iso);
  return addDaysISO(iso, weekday === 0 ? -6 : 1 - weekday);
}

/** Os 7 dias (Segunda → Domingo) da semana que contém o dia indicado. */
export function weekDaysISO(iso: string): string[] {
  const monday = startOfWeekISO(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/** Dia do mês (1–31) de um YYYY-MM-DD. */
export function dayOfMonthISO(iso: string): number {
  return Number(iso.slice(8, 10));
}
