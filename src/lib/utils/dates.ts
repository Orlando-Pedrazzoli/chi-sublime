/**
 * Chi Sublime — Presets de intervalos de datas
 * ============================================================
 *
 * Usado por relatórios, dashboard e filtros de transações.
 * Todos os cálculos assentam em Europe/Lisbon via time-utils.
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { SALON_TIMEZONE } from '@/lib/constants/business';
import type { DateRange } from '@/types/common';

export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'this-year';

export const RANGE_PRESET_LABEL: Record<RangePreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  'this-week': 'Esta semana',
  'last-week': 'Semana passada',
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  'this-year': 'Este ano',
};

/** Devolve "agora" nas horas locais de Lisboa (como Date "solta") */
function lisbonNow(): Date {
  return toZonedTime(new Date(), SALON_TIMEZONE);
}

/** Converte uma Date de "parede" de Lisboa de volta para instante UTC */
function toUtc(local: Date): Date {
  return fromZonedTime(local, SALON_TIMEZONE);
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Início da semana (segunda-feira) para uma data local */
function startOfLocalWeek(d: Date): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/**
 * Resolve um preset num intervalo [from, to] em UTC, pronto para
 * queries MongoDB ($gte / $lte).
 */
export function resolveRange(preset: RangePreset): DateRange {
  const now = lisbonNow();

  switch (preset) {
    case 'today':
      return { from: toUtc(startOfLocalDay(now)), to: toUtc(endOfLocalDay(now)) };

    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: toUtc(startOfLocalDay(y)), to: toUtc(endOfLocalDay(y)) };
    }

    case 'this-week': {
      const start = startOfLocalWeek(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: toUtc(start), to: toUtc(endOfLocalDay(end)) };
    }

    case 'last-week': {
      const start = startOfLocalWeek(now);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: toUtc(start), to: toUtc(endOfLocalDay(end)) };
    }

    case 'this-month': {
      const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { from: toUtc(start), to: toUtc(end) };
    }

    case 'last-month': {
      const start = startOfLocalDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { from: toUtc(start), to: toUtc(end) };
    }

    case 'this-year': {
      const start = startOfLocalDay(new Date(now.getFullYear(), 0, 1));
      const end = endOfLocalDay(new Date(now.getFullYear(), 11, 31));
      return { from: toUtc(start), to: toUtc(end) };
    }
  }
}
