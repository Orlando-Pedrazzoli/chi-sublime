/**
 * Chi Sublime — Conflict Detection
 * ============================================================
 *
 * Funcoes para detectar conflitos:
 *  - Slot vs reservas existentes
 *  - Slot vs breaks (almoco, etc.)
 *  - Slot vs limite de horario
 *
 * Convencao: TODOS os tempos em minutos desde meia-noite (number).
 */

import { dateRangesOverlap } from '@/lib/utils/time-utils';

export type Break = { start: string; end: string };

/**
 * Verifica se um slot [slotStart, slotEnd] cai (parcial ou totalmente)
 * dentro de algum break.
 *
 * @param slotStart minutos desde meia-noite
 * @param slotEnd   minutos desde meia-noite
 * @param breaks    array de breaks com start/end em "HH:MM"
 */
export function slotConflictsWithBreaks(
  slotStart: number,
  slotEnd: number,
  breaks: Break[],
): boolean {
  for (const brk of breaks) {
    const brkStart = parseTime(brk.start);
    const brkEnd = parseTime(brk.end);
    // Sobreposicao real (nao toque)
    if (slotStart < brkEnd && brkStart < slotEnd) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica se um slot [slotStartDate, slotEndDate] sobrepoe a alguma
 * reserva existente.
 *
 * Considera o `bufferAfter` da reserva existente — ou seja, reserva
 * de 10:00-11:00 com buffer 15min ocupa efetivamente 10:00-11:15.
 */
export function slotConflictsWithBookings(
  slotStartDate: Date,
  slotEndDate: Date,
  existingBookings: ExistingBooking[],
): { hasConflict: boolean; conflictingBookingId?: string } {
  for (const booking of existingBookings) {
    const effectiveEnd = new Date(booking.endTime.getTime() + booking.bufferAfter * 60 * 1000);

    if (dateRangesOverlap(slotStartDate, slotEndDate, booking.startTime, effectiveEnd)) {
      return { hasConflict: true, conflictingBookingId: booking.id };
    }
  }
  return { hasConflict: false };
}

/**
 * Tipo de reserva existente (input para conflict detection).
 * Apenas os campos que precisamos.
 */
export type ExistingBooking = {
  id: string;
  startTime: Date;
  endTime: Date;
  /** Buffer apos a reserva (minutos) — staff precisa de tempo para preparar proxima */
  bufferAfter: number;
};

// ============================================================
// Helpers internos
// ============================================================

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
