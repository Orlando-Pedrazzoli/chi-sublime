// 📄 src/app/reservar/[bookingNumber]/page.tsx
/**
 * Chi Sublime — Reservar [bookingNumber] (Pagina de sucesso)
 * ============================================================
 *
 * Server Component publico que mostra os detalhes da reserva
 * apos criacao bem-sucedida.
 *
 * Identificada pelo bookingNumber na URL (ex: /reservar/CHI-2026-0042).
 *
 * Seguranca (RGPD):
 *  - O bookingNumber é SEQUENCIAL (CHI-2026-0001, 0002…) e portanto
 *    adivinhável. Antes a página era pública e mostrava nome, email
 *    completo, serviços e data de qualquer reserva.
 *  - Agora só o cliente dono da reserva (sessão) ou um admin a veem.
 *    Sem sessão → login com regresso a esta página. Sessão de outra
 *    pessoa → 404 (não revela que a reserva existe).
 *  - noindex: nunca deve aparecer em motores de busca.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BOOKING_RULES } from '@/lib/constants/business';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';

export const metadata: Metadata = {
  title: 'A sua marcação | Chi Sublime',
  description: 'Detalhes da sua reserva no Chi Sublime.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

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
    ownerClientId: booking.clientId ? String(booking.clientId) : null,
    bookingNumber: booking.bookingNumber,
    clientName,
    clientEmail,
    staffName,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
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
  if (!/^CHI-\d{4}-\d{4,}$/.test(bookingNumber)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    redirect(`/entrar?redirect=${encodeURIComponent(`/reservar/${bookingNumber}`)}`);
  }

  const booking = await getBookingByNumber(bookingNumber);

  const isAdmin = session.user.role === 'admin';
  const isOwner =
    !!booking?.ownerClientId &&
    session.user.role === 'client' &&
    session.user.clientId === booking.ownerClientId;

  if (!booking || (!isAdmin && !isOwner)) {
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
            <Link
              href="/reservar"
              className="bg-chi-green-deep inline-block px-8 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase"
              style={{ color: '#FAF7F2' }}
            >
              Fazer nova reserva
            </Link>
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
          endTime={booking.endTime}
          status={booking.status === 'pending' ? 'pending' : 'confirmed'}
          cancellationWindowHours={BOOKING_RULES.cancellationWindowHours}
          totalPrice={booking.totalPrice}
          totalDuration={booking.totalDuration}
          services={booking.services}
        />
      </main>
      <PublicFooter />
    </>
  );
}
