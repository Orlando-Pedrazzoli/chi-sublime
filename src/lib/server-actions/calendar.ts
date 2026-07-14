// 📄 src/lib/server-actions/calendar.ts
/**
 * Chi Sublime — Calendar Server Actions
 * ============================================================
 *
 * Wrapper 'use server' da disponibilidade mensal, consumido
 * pelo CalendarPicker (client) no Step 2 do fluxo de reservas.
 *
 * Separado de bookings.ts de propósito: este endpoint é chamado
 * a cada navegação de mês no calendário e não partilha nada com
 * o ciclo de vida de criação/cancelamento de reservas.
 */

'use server';

import {
  getMonthAvailability,
  type MonthAvailabilityResult,
} from '@/lib/booking/month-availability';

export type GetMonthAvailabilityInput = {
  /** Ano (ex: 2026) */
  year: number;
  /** Mês 1-12 */
  month: number;
  serviceIds: string[];
  staffId: string; // id específico ou 'any'
};

export async function getMonthAvailabilityAction(
  input: GetMonthAvailabilityInput,
): Promise<MonthAvailabilityResult> {
  // Sanitização defensiva (o cálculo pesado valida o resto)
  const year = Math.trunc(Number(input.year));
  const month = Math.trunc(Number(input.month));

  if (!Number.isFinite(year) || year < 2024 || year > 2100 || month < 1 || month > 12) {
    return {
      month: `${input.year}-${String(input.month).padStart(2, '0')}`,
      days: [],
      todayISO: '',
      horizonISO: '',
      error: { code: 'invalid-services', message: 'Mes invalido' },
    };
  }

  return getMonthAvailability({
    year,
    month,
    serviceIds: input.serviceIds ?? [],
    staffId: input.staffId === 'any' ? 'any' : input.staffId,
  });
}
