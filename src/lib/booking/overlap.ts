// 📄 src/lib/booking/overlap.ts
/**
 * Chi Sublime — Sobreposição de marcações (fronteira de ESCRITA)
 * ============================================================
 *
 * Um único sítio para as duas perguntas que todas as escritas fazem
 * (marcação online, marcação manual, remarcação):
 *
 *   1. ANTES de gravar — "este intervalo sobrepõe alguma marcação
 *      ativa deste profissional?"            → findOverlappingBooking
 *   2. DEPOIS de gravar — "alguém gravou por cima de mim entretanto?"
 *                                            → lostWriteRace
 *
 * PORQUÊ O PASSO 2 (nov. 2026):
 * O índice único { staffId, startTime } só apanha duas marcações com
 * o MESMO início. Duas marcações com inícios diferentes que se
 * sobrepõem (ex.: 10:00–11:00 online e um encaixe 10:15 no balcão, ou
 * dois serviços longos em slots vizinhos) passavam ambas se os dois
 * pedidos verificassem o conflito antes de qualquer um gravar.
 *
 * Regra: quem grava volta a ler; se vir OUTRA marcação ativa por cima,
 * desiste. Para as duas sobreviverem, cada uma teria de ler antes de a
 * outra gravar — impossível, porque cada leitura vem depois da própria
 * escrita. No pior caso (pedidos mesmo simultâneos) desistem as duas e
 * o utilizador volta a tentar; nunca ficam duas marcações em cima uma
 * da outra.
 */

import type mongoose from 'mongoose';
import { Booking, SLOT_BLOCKING_STATUSES } from '@/lib/models';
import { BOOKING_RULES } from '@/lib/constants/business';
import { slotConflictsWithBookings } from './conflicts';

type Id = string | mongoose.Types.ObjectId;

/** Maior buffer possível numa marcação (Booking.bufferAfter max) */
const MAX_BUFFER_MS = 120 * 60_000;

export type OverlapQuery = {
  staffId: Id;
  startTime: Date;
  endTime: Date;
  /** Marcação a ignorar (ela própria, numa remarcação ou após gravar) */
  excludeId?: Id;
  /**
   * true  → conta o buffer de limpeza das marcações existentes (regra
   *         do motor de disponibilidade; usada na marcação online).
   * false → só sobreposição real de cadeira (encaixes forçados do admin).
   */
  withBuffer?: boolean;
};

/**
 * Primeira marcação ATIVA do profissional que colide com o intervalo.
 * Devolve null quando o intervalo está livre.
 */
export async function findOverlappingBooking(
  query: OverlapQuery,
): Promise<{ id: string; bookingNumber: string } | null> {
  const { staffId, startTime, endTime, excludeId, withBuffer = false } = query;

  const candidates = await Booking.find({
    staffId,
    status: { $in: SLOT_BLOCKING_STATUSES },
    startTime: { $lt: endTime },
    // Com buffer, uma marcação que acabou há pouco ainda pode colidir
    endTime: { $gt: withBuffer ? new Date(startTime.getTime() - MAX_BUFFER_MS) : startTime },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .select('_id bookingNumber startTime endTime bufferAfter')
    .lean();

  if (candidates.length === 0) return null;

  const result = slotConflictsWithBookings(
    startTime,
    endTime,
    candidates.map((b) => ({
      id: String(b._id),
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime),
      bufferAfter: withBuffer ? (b.bufferAfter ?? BOOKING_RULES.defaultBufferMinutes) : 0,
    })),
  );

  if (!result.hasConflict) return null;
  const hit = candidates.find((b) => String(b._id) === result.conflictingBookingId);
  return hit ? { id: String(hit._id), bookingNumber: hit.bookingNumber } : null;
}

/**
 * Chamar LOGO A SEGUIR a gravar uma marcação ativa. Devolve true se
 * outra marcação ativa ocupa o mesmo intervalo — quem chama tem de
 * desfazer a sua escrita (apagar a marcação acabada de criar, ou repor
 * a hora antiga numa remarcação) e responder "horário ocupado".
 */
export async function lostWriteRace(
  query: Required<Pick<OverlapQuery, 'staffId' | 'startTime' | 'endTime' | 'excludeId'>> &
    Pick<OverlapQuery, 'withBuffer'>,
): Promise<boolean> {
  return (await findOverlappingBooking(query)) !== null;
}
