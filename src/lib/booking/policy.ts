// 📄 src/lib/booking/policy.ts
/**
 * Chi Sublime — Política de confirmação das marcações
 * ============================================================
 *
 * Decisão (alinhada com Fresha, Booksy, Treatwell, Square):
 * CONFIRMAÇÃO INSTANTÂNEA. A disponibilidade mostrada ao cliente já é
 * real (horário do salão ∩ profissional ∩ pausas ∩ férias ∩ reservas),
 * por isso não há nada para o salão "aprovar" — pedir aprovação só
 * acrescenta espera, marcações abandonadas e horários bloqueados por
 * pedidos que ninguém confirmou.
 *
 * O modo 'manual' fica disponível em BOOKING_POLICY.approvalMode para
 * casos excecionais (ex.: época de noivas). Com 'manual':
 *   - reserva online nasce 'pending' e o cliente recebe "Pedido recebido";
 *   - quando o admin confirma, o cliente recebe a confirmação + calendário;
 *   - se o admin cancelar um pedido pendente, o email diz "não foi possível
 *     confirmar" (e não "cancelada");
 *   - lembretes só para reservas 'confirmed'.
 */

import { BOOKING_POLICY } from '@/lib/constants/business';
import type { BookingStatus } from '@/lib/models/Booking';

export function isManualApproval(): boolean {
  return BOOKING_POLICY.approvalMode === 'manual';
}

/** Estado inicial de uma reserva feita pelo cliente no site. */
export function getOnlineBookingInitialStatus(): Extract<BookingStatus, 'pending' | 'confirmed'> {
  return isManualApproval() ? 'pending' : 'confirmed';
}

/**
 * Estados que recebem lembrete. Em modo automático inclui 'pending'
 * para não deixar sem lembrete reservas antigas criadas antes desta
 * política (ver scripts/confirm-pending-bookings.ts).
 */
export function getReminderStatuses(): BookingStatus[] {
  return isManualApproval() ? ['confirmed'] : ['pending', 'confirmed'];
}
