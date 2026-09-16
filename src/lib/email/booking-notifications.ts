// 📄 src/lib/email/booking-notifications.ts
/**
 * Chi Sublime — Notificações de reserva (orquestração)
 * ============================================================
 *
 * Ponto único chamado pelas server actions. Formata datas
 * (Europe/Lisbon) e dispara os emails em paralelo.
 *
 *  criada   confirmed → CLIENTE: confirmação + .ics   | SALÃO: nova marcação
 *           pending   → CLIENTE: pedido recebido      | SALÃO: por confirmar
 *  confirmada (pending → confirmed pelo admin)
 *                     → CLIENTE: confirmação + .ics
 *  cancelada          → CLIENTE: cancelada | pedido não confirmado
 *                       SALÃO: alerta, quando foi a cliente a cancelar
 *
 * Nunca lança — uma falha de email não pode falhar a reserva. Chamar
 * com `await` (em serverless um fire-and-forget pode morrer com a
 * lambda antes de o Resend responder).
 */

import {
  sendBookingCancellationEmail,
  sendBookingCancelledAdminEmail,
  sendBookingConfirmationEmail,
  sendBookingRequestReceivedEmail,
  sendNewBookingAdminEmail,
  type SendEmailResult,
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

/** Regista falhas — sendEmail resolve com { ok:false } em vez de lançar. */
async function settle(jobs: Array<{ label: string; job: Promise<SendEmailResult> }>) {
  const results = await Promise.allSettled(jobs.map((j) => j.job));
  results.forEach((r, i) => {
    const label = jobs[i].label;
    if (r.status === 'rejected') {
      console.error(`[booking-notifications] ${label} falhou:`, r.reason);
    } else if (!r.value.ok) {
      console.error(`[booking-notifications] ${label} não enviado:`, r.value);
    }
  });
}

// ------------------------------------------------------------
// Reserva criada
// ------------------------------------------------------------

export type BookingCreatedNotification = {
  bookingNumber: string;
  startTime: Date;
  /** Necessário para o convite de calendário */
  endTime?: Date;
  services: string[];
  staffName: string;
  totalPrice: number; // cêntimos
  source: string;
  /** Estado com que a reserva nasceu. Default: 'confirmed' */
  status?: 'pending' | 'confirmed';
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
  /** false em reservas criadas pelo admin — o salão já sabe. Default: true */
  notifySalon?: boolean;
};

export async function notifyBookingCreated(params: BookingCreatedNotification): Promise<void> {
  const date = dateFmt.format(params.startTime);
  const time = timeFmt.format(params.startTime);
  const services = params.services.join(', ');
  const total = euros(params.totalPrice);
  const pending = params.status === 'pending';

  const jobs: Array<{ label: string; job: Promise<SendEmailResult> }> = [];

  // Cliente (reservas por telefone podem não ter email)
  if (params.client.email) {
    const base = {
      to: params.client.email,
      name: params.client.name,
      bookingNumber: params.bookingNumber,
      date,
      time,
      services,
      staffName: params.staffName,
      total,
    };
    jobs.push(
      pending
        ? { label: 'pedido recebido (cliente)', job: sendBookingRequestReceivedEmail(base) }
        : {
            label: 'confirmação (cliente)',
            job: sendBookingConfirmationEmail({
              ...base,
              startTime: params.startTime,
              endTime: params.endTime,
            }),
          },
    );
  }

  // Salão — o "toque no bolso" a cada reserva nova
  if (params.notifySalon !== false) {
    jobs.push({
      label: 'alerta nova marcação (salão)',
      job: sendNewBookingAdminEmail({
        bookingNumber: params.bookingNumber,
        clientName: params.client.name,
        clientPhone: params.client.phone,
        date,
        time,
        services,
        staffName: params.staffName,
        total,
        source: params.source,
        pendingApproval: pending,
      }),
    });
  }

  await settle(jobs);
}

// ------------------------------------------------------------
// Pedido confirmado pelo salão (pending → confirmed)
// ------------------------------------------------------------

export type BookingConfirmedNotification = {
  bookingNumber: string;
  startTime: Date;
  endTime: Date;
  services: string[];
  staffName: string;
  totalPrice: number;
  client: { name: string; email?: string };
};

export async function notifyBookingConfirmed(params: BookingConfirmedNotification): Promise<void> {
  if (!params.client.email) return;
  await settle([
    {
      label: 'confirmação após aprovação (cliente)',
      job: sendBookingConfirmationEmail({
        to: params.client.email,
        name: params.client.name,
        bookingNumber: params.bookingNumber,
        date: dateFmt.format(params.startTime),
        time: timeFmt.format(params.startTime),
        services: params.services.join(', '),
        staffName: params.staffName,
        total: euros(params.totalPrice),
        startTime: params.startTime,
        endTime: params.endTime,
        approvedBySalon: true,
      }),
    },
  ]);
}

// ------------------------------------------------------------
// Reserva cancelada
// ------------------------------------------------------------

export type BookingCancelledNotification = {
  bookingNumber: string;
  startTime: Date;
  reason?: string;
  /** 'declined' = pedido pendente que o salão não confirmou */
  variant?: 'cancelled' | 'declined';
  client: {
    name: string;
    email?: string;
    phone?: string;
  };
  /**
   * Preencher quando foi a CLIENTE a cancelar: o salão recebe um alerta
   * de que o horário ficou livre. Omitir quando foi o próprio salão.
   */
  salonAlert?: {
    services?: string[];
    staffName?: string;
  };
};

export async function notifyBookingCancelled(params: BookingCancelledNotification): Promise<void> {
  const date = dateFmt.format(params.startTime);
  const time = timeFmt.format(params.startTime);
  const jobs: Array<{ label: string; job: Promise<SendEmailResult> }> = [];

  if (params.client.email) {
    jobs.push({
      label: 'cancelamento (cliente)',
      job: sendBookingCancellationEmail({
        to: params.client.email,
        name: params.client.name,
        bookingNumber: params.bookingNumber,
        date,
        time,
        reason: params.reason,
        variant: params.variant,
      }),
    });
  }

  if (params.salonAlert) {
    jobs.push({
      label: 'alerta cancelamento (salão)',
      job: sendBookingCancelledAdminEmail({
        bookingNumber: params.bookingNumber,
        clientName: params.client.name,
        clientPhone: params.client.phone,
        date,
        time,
        services: params.salonAlert.services?.join(', '),
        staffName: params.salonAlert.staffName,
        reason: params.reason,
      }),
    });
  }

  await settle(jobs);
}
