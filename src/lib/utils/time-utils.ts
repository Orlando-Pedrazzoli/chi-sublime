/**
 * Chi Sublime — Time utilities
 * ============================================================
 *
 * Helpers para manipular horas no formato "HH:MM" (string) e
 * conversoes com timezone Europe/Lisbon.
 *
 * Decisoes:
 *  - Tudo em Europe/Lisbon (clientes podem aceder de qualquer fuso)
 *  - Usa date-fns-tz (ja instalado) para conversoes timezone-aware
 *  - "HH:MM" como string para horarios (mais legivel e leve em DB)
 *  - Minutos desde meia-noite (number) para aritmetica
 */

import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const SALON_TIMEZONE = 'Europe/Lisbon';

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

const WEEKDAY_BY_NUMBER: Record<number, WeekDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// ============================================================
// Conversoes HH:MM <-> minutos
// ============================================================

/**
 * Converte "HH:MM" para minutos desde meia-noite.
 *
 * @example
 * timeToMinutes("10:00") -> 600
 * timeToMinutes("13:30") -> 810
 */
export function timeToMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Hora invalida: "${time}" (esperado HH:MM)`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Hora fora do intervalo: "${time}"`);
  }
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite para "HH:MM".
 *
 * @example
 * minutesToTime(600)  -> "10:00"
 * minutesToTime(810)  -> "13:30"
 * minutesToTime(1395) -> "23:15"
 */
export function minutesToTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new Error(`Minutos fora do intervalo [0, 1440): ${minutes}`);
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ============================================================
// Timezone helpers
// ============================================================

/**
 * Devolve o dia da semana de uma data, no timezone do salao.
 *
 * @example
 * getWeekDay(new Date("2026-05-07T08:00:00Z")) -> "thursday"
 */
export function getWeekDay(date: Date): WeekDay {
  const lisbonDate = toZonedTime(date, SALON_TIMEZONE);
  return WEEKDAY_BY_NUMBER[lisbonDate.getDay()];
}

/**
 * Devolve YYYY-MM-DD para uma Date, no timezone do salao.
 *
 * @example
 * toISODate(new Date("2026-05-07T15:00:00Z")) -> "2026-05-07"
 */
export function toISODate(date: Date): string {
  return formatInTimeZone(date, SALON_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Verifica se duas datas representam o mesmo dia (no timezone do salao).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/**
 * Devolve a hora atual em Europe/Lisbon como minutos desde meia-noite.
 *
 * @example (se for 14:43 em Lisboa)
 * getCurrentMinutesInLisbon() -> 883
 */
export function getCurrentMinutesInLisbon(): number {
  const now = new Date();
  const lisbonNow = toZonedTime(now, SALON_TIMEZONE);
  return lisbonNow.getHours() * 60 + lisbonNow.getMinutes();
}

/**
 * Combina uma data (dia) com uma hora "HH:MM" e devolve um Date UTC
 * que representa essa data+hora no fuso de Lisboa.
 *
 * Usa fromZonedTime do date-fns-tz: dado um instante "como se fosse local
 * de Lisboa", devolve o equivalente em UTC.
 *
 * @example
 * combineDateAndTime(new Date("2026-05-07"), "14:30")
 * -> Date representando 2026-05-07 14:30 em Lisboa
 */
export function combineDateAndTime(date: Date, time: string): Date {
  const isoDate = toISODate(date);
  const localISO = `${isoDate}T${time}:00`;
  return fromZonedTime(localISO, SALON_TIMEZONE);
}

// ============================================================
// Range overlap detection
// ============================================================

/**
 * Verifica se dois intervalos de tempo se sobrepoem.
 * Aceita strings "HH:MM" ou minutos (number).
 *
 * @example
 * timeRangesOverlap("10:00", "11:00", "10:30", "11:30") -> true
 * timeRangesOverlap("10:00", "11:00", "11:00", "12:00") -> false (toca mas nao sobrepoe)
 * timeRangesOverlap("10:00", "11:00", "11:30", "12:00") -> false
 */
export function timeRangesOverlap(
  startA: string | number,
  endA: string | number,
  startB: string | number,
  endB: string | number,
): boolean {
  const a1 = typeof startA === 'string' ? timeToMinutes(startA) : startA;
  const a2 = typeof endA === 'string' ? timeToMinutes(endA) : endA;
  const b1 = typeof startB === 'string' ? timeToMinutes(startB) : startB;
  const b2 = typeof endB === 'string' ? timeToMinutes(endB) : endB;

  return a1 < b2 && b1 < a2;
}

/**
 * Verifica se dois intervalos de Date se sobrepoem.
 */
export function dateRangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

// ============================================================
// Arredondamento
// ============================================================

/**
 * Arredonda minutos para o proximo multiplo de N (ceil).
 *
 * @example
 * roundUpToInterval(823, 30) -> 840 (= 14:00)
 * roundUpToInterval(840, 30) -> 840 (ja e multiplo)
 * roundUpToInterval(841, 30) -> 870 (= 14:30)
 */
export function roundUpToInterval(minutes: number, interval: number): number {
  return Math.ceil(minutes / interval) * interval;
}
