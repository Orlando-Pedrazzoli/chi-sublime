// 📄 src/app/api/cron/reminders/route.ts
/**
 * Chi Sublime — Cron: Lembretes de reserva
 * ============================================================
 *
 * Corre diariamente (vercel.json). Envia o lembrete "dia antes" ao
 * cliente para todas as reservas ativas (pending/confirmed) que:
 *
 *   - começam nas próximas 36 horas (janela cobre "amanhã" e
 *     reservas do próprio dia criadas com antecedência), e
 *   - ainda não receberam o lembrete (remindersSent.dayBefore=false).
 *
 * O flag só é marcado APÓS envio bem-sucedido — se o Resend falhar,
 * a reserva volta a ser apanhada na próxima execução. Usa o índice
 * { status, startTime, remindersSent.dayBefore } já existente.
 *
 * Segurança: exige `Authorization: Bearer ${CRON_SECRET}` (enviado
 * automaticamente pelo Vercel quando a env var está definida).
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Booking, Staff, User } from '@/lib/models';
import { sendBookingReminderEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';

const WINDOW_HOURS = 36;

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

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

  const bookings = await Booking.find({
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $gt: now, $lte: windowEnd },
    'remindersSent.dayBefore': { $ne: true },
  });

  if (bookings.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, sent: 0, skipped: 0 });
  }

  // Resolver nomes de staff e emails de clientes registados em batch
  const staffIds = [...new Set(bookings.map((b) => String(b.staffId)))];
  const userIds = [...new Set(bookings.filter((b) => b.clientId).map((b) => String(b.clientId)))];

  const [staffDocs, userDocs] = await Promise.all([
    Staff.find({ _id: { $in: staffIds } }).select('name'),
    userIds.length > 0
      ? User.find({ _id: { $in: userIds } }).select('name email')
      : Promise.resolve([]),
  ]);

  const staffNameById = new Map(staffDocs.map((s) => [String(s._id), s.name]));
  const userById = new Map(userDocs.map((u) => [String(u._id), u]));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    // Destinatário: guestInfo ou User registado
    const user = booking.clientId ? userById.get(String(booking.clientId)) : undefined;
    const to = booking.guestInfo?.email ?? user?.email;
    const name = booking.guestInfo?.name ?? user?.name;

    if (!to || !name) {
      skipped += 1; // reserva por telefone sem email — nada a enviar
      continue;
    }

    try {
      const result = await sendBookingReminderEmail({
        to,
        name,
        bookingNumber: booking.bookingNumber,
        date: dateFmt.format(booking.startTime),
        time: timeFmt.format(booking.startTime),
        services: booking.services.map((s) => s.name).join(', '),
        staffName: staffNameById.get(String(booking.staffId)) ?? 'Chi Sublime',
      });

      if (result.ok) {
        await Booking.updateOne(
          { _id: booking._id },
          { $set: { 'remindersSent.dayBefore': true } },
        );
        sent += 1;
      } else {
        errors.push(booking.bookingNumber);
      }
    } catch (err) {
      console.error('[cron/reminders]', booking.bookingNumber, err);
      errors.push(booking.bookingNumber);
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: bookings.length,
    sent,
    skipped,
    errors,
  });
}
