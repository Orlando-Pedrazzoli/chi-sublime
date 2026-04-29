/**
 * Chi Sublime — Reservar [bookingNumber] (Pagina de sucesso)
 * ============================================================
 *
 * Server Component publico que mostra os detalhes da reserva
 * apos criacao bem-sucedida.
 *
 * Identificada pelo bookingNumber na URL (ex: /reservar/CHI-2026-0042).
 *
 * Seguranca:
 *  - URL e publica mas booking number e dificil de adivinhar
 *  - Mostra apenas dados nao-sensiveis
 *  - Nao expoe NIF, telefone, etc — apenas nome + email parcial
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';

export const metadata: Metadata = {
  title: 'Reserva confirmada | Chi Sublime',
  description: 'Detalhes da sua reserva no Chi Sublime.',
};

type Props = {
  params: Promise<{ bookingNumber: string }>;
};

async function getBookingByNumber(bookingNumber: string) {
  await connectDB();

  const booking = await Booking.findOne({ bookingNumber }).lean();
  if (!booking) return null;

  // Buscar dados do cliente
  let clientName = 'Cliente';
  let clientEmail = '';

  if (booking.clientId) {
    const client = await Client.findById(booking.clientId).lean();
    if (client) {
      clientName = client.name;
      clientEmail = client.email ?? '';
    }
  } else if (booking.guestInfo) {
    clientName = booking.guestInfo.name;
    clientEmail = booking.guestInfo.email;
  }

  // Buscar staff name
  const staff = await Staff.findById(booking.staffId).lean();
  const staffName = staff?.name ?? 'Profissional';

  return {
    bookingNumber: booking.bookingNumber,
    clientName,
    clientEmail,
    staffName,
    startTime: booking.startTime.toISOString(),
    totalPrice: booking.totalPrice,
    totalDuration: booking.totalDuration,
    services: booking.services.map((s) => ({
      name: s.name,
      duration: s.duration,
      price: s.price,
    })),
    status: booking.status,
  };
}

export default async function BookingSuccessPage({ params }: Props) {
  const { bookingNumber } = await params;

  // Validar formato
  if (!/^CHI-\d{4}-\d{4}$/.test(bookingNumber)) {
    notFound();
  }

  const booking = await getBookingByNumber(bookingNumber);

  if (!booking) {
    notFound();
  }

  // Se reserva foi cancelada, mostrar uma mensagem diferente
  if (booking.status === 'cancelled') {
    return (
      <>
        <PublicNavbar />
        <main className="bg-chi-cream flex min-h-screen flex-col items-center justify-center pt-32 pb-20">
          <div className="max-w-md px-6 text-center">
            <h1 className="text-chi-charcoal mb-4 font-serif text-3xl md:text-4xl">
              Reserva cancelada
            </h1>
            <p className="text-chi-charcoal-soft mb-8">
              A reserva <span className="font-mono">{bookingNumber}</span> foi cancelada.
            </p>
            <a
              href="/reservar"
              className="bg-chi-green-deep inline-block px-8 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase"
              style={{ color: '#FAF7F2' }}
            >
              Fazer nova reserva
            </a>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicNavbar />
      <main className="bg-chi-cream min-h-screen pt-32">
        <BookingConfirmation
          bookingNumber={booking.bookingNumber}
          clientName={booking.clientName}
          clientEmail={booking.clientEmail}
          staffName={booking.staffName}
          startTime={booking.startTime}
          totalPrice={booking.totalPrice}
          totalDuration={booking.totalDuration}
          services={booking.services}
        />
      </main>
      <PublicFooter />
    </>
  );
}
