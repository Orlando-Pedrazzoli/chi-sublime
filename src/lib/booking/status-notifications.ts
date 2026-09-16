// 📄 src/lib/booking/status-notifications.ts
/**
 * Chi Sublime — Emails nas mudanças de estado feitas pelo SALÃO
 * ============================================================
 *
 * Um único sítio para as duas actions de admin que mudam estados
 * (admin-bookings.ts, usada pela agenda, e manual-bookings.ts):
 *
 *   pending   → confirmed  : cliente recebe a confirmação + .ics
 *   pending   → cancelled  : "não foi possível confirmar o teu pedido"
 *   confirmed → cancelled  : "marcação cancelada"
 *
 * Só envia para reservas futuras. Nunca lança.
 */

import { Client, Staff, type IBooking } from '@/lib/models';
import { notifyBookingCancelled, notifyBookingConfirmed } from '@/lib/email/booking-notifications';

type BookingLike = Pick<
  IBooking,
  | 'bookingNumber'
  | 'clientId'
  | 'guestInfo'
  | 'staffId'
  | 'services'
  | 'startTime'
  | 'endTime'
  | 'totalPrice'
  | 'status'
  | 'cancellationReason'
>;

async function resolveContact(booking: BookingLike) {
  if (booking.clientId) {
    const client = await Client.findById(booking.clientId).select('name email phone').lean();
    if (client) return { name: client.name, email: client.email ?? undefined, phone: client.phone };
  }
  return {
    name: booking.guestInfo?.name ?? 'Cliente',
    email: booking.guestInfo?.email,
    phone: booking.guestInfo?.phone,
  };
}

export async function notifyAdminStatusChange(
  booking: BookingLike,
  previousStatus: IBooking['status'],
): Promise<void> {
  try {
    if (booking.status === previousStatus) return;
    if (booking.startTime.getTime() <= Date.now()) return;

    if (previousStatus === 'pending' && booking.status === 'confirmed') {
      const [client, staff] = await Promise.all([
        resolveContact(booking),
        Staff.findById(booking.staffId).select('name').lean(),
      ]);
      await notifyBookingConfirmed({
        bookingNumber: booking.bookingNumber,
        startTime: booking.startTime,
        endTime: booking.endTime,
        services: booking.services.map((s) => s.name),
        staffName: staff?.name ?? 'Chi Sublime',
        totalPrice: booking.totalPrice,
        client,
      });
      return;
    }

    if (booking.status === 'cancelled' && ['pending', 'confirmed'].includes(previousStatus)) {
      const client = await resolveContact(booking);
      await notifyBookingCancelled({
        bookingNumber: booking.bookingNumber,
        startTime: booking.startTime,
        reason: booking.cancellationReason,
        variant: previousStatus === 'pending' ? 'declined' : 'cancelled',
        client,
      });
    }
  } catch (err) {
    console.error('[notifyAdminStatusChange]', booking.bookingNumber, err);
  }
}
