// 📄 src/lib/email/booking-notifications.ts
/**
 * Chi Sublime — Notificações de reserva (orquestração)
 * ============================================================
 *
 * Ponto único chamado pelas server actions quando uma reserva é
 * criada/cancelada. Formata datas (Europe/Lisbon) e dispara os
 * emails em paralelo:
 *
 *  criada    → confirmação ao CLIENTE + alerta ao SALÃO
 *              (o alerta substitui o push do Noona HQ)
 *  cancelada → aviso ao CLIENTE
 *
 * Fire-and-forget seguro: nunca lança — uma falha de email não
 * pode falhar a reserva. Usar sempre com `void notifyX(...)`.
 */

import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
  sendNewBookingAdminEmail,
} from './send';

// ------------------------------------------------------------
// Formatação (Europe/Lisbon)
// ------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  hour: '2-digit',
  minute: '2-digit',
});

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

// ------------------------------------------------------------
// Reserva criada
// ------------------------------------------------------------

export type BookingCreatedNotification = {
  bookingNumber: string;
  startTime: Date;
  services: string[];
  staffName: string;
  totalPrice: number; // cêntimos
  source: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
};

export async function notifyBookingCreated(params: BookingCreatedNotification): Promise<void> {
  const date = dateFmt.format(params.startTime);
  const time = timeFmt.format(params.startTime);
  const services = params.services.join(', ');
  const total = euros(params.totalPrice);

  const jobs: Promise<unknown>[] = [];

  // 1) Confirmação ao cliente (só se tiver email — reservas por
  //    telefone podem não ter)
  if (params.client.email) {
    jobs.push(
      sendBookingConfirmationEmail({
        to: params.client.email,
        name: params.client.name,
        bookingNumber: params.bookingNumber,
        date,
        time,
        services,
        staffName: params.staffName,
        total,
      }),
    );
  }

  // 2) Alerta ao salão — o "toque no bolso" a cada reserva nova
  jobs.push(
    sendNewBookingAdminEmail({
      bookingNumber: params.bookingNumber,
      clientName: params.client.name,
      clientPhone: params.client.phone,
      date,
      time,
      services,
      staffName: params.staffName,
      total,
      source: params.source,
    }),
  );

  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[booking-notifications] envio falhou:', r.reason);
    }
  }
}

// ------------------------------------------------------------
// Reserva cancelada
// ------------------------------------------------------------

export type BookingCancelledNotification = {
  bookingNumber: string;
  startTime: Date;
  reason?: string;
  client: {
    name: string;
    email?: string;
  };
};

export async function notifyBookingCancelled(params: BookingCancelledNotification): Promise<void> {
  if (!params.client.email) return;

  try {
    await sendBookingCancellationEmail({
      to: params.client.email,
      name: params.client.name,
      bookingNumber: params.bookingNumber,
      date: dateFmt.format(params.startTime),
      time: timeFmt.format(params.startTime),
      reason: params.reason,
    });
  } catch (err) {
    console.error('[booking-notifications] cancelamento: envio falhou:', err);
  }
}
