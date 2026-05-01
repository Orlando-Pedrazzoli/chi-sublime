'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { cancelMyBookingAction, type BookingForClient } from '@/lib/server-actions/bookings';

type Props = {
  bookings: BookingForClient[];
};

export function MyBookings({ bookings: initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings);
  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const future = bookings.filter((b) => b.isFuture && b.status !== 'cancelled');
  const past = bookings.filter((b) => !b.isFuture || b.status === 'cancelled');

  function handleCancel(bookingNumber: string) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await cancelMyBookingAction({ bookingNumber });

      if (result.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingNumber === bookingNumber
              ? { ...b, status: 'cancelled' as const, isCancellable: false }
              : b,
          ),
        );
        setConfirmingCancel(null);
      } else {
        setErrorMessage(result.error.message);
      }
    });
  }

  if (bookings.length === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
      >
        <Calendar size={48} strokeWidth={1} className="mx-auto mb-4" style={{ color: '#D4AF6E' }} />
        <h3 className="mb-2 font-serif text-2xl" style={{ color: '#1A1A1A' }}>
          Sem reservas ainda
        </h3>
        <p className="mb-6 text-sm" style={{ color: '#5A5A5A' }}>
          Marca a tua primeira reserva e começa a tua experiência Chi Sublime.
        </p>
        <Link
          href="/reservar"
          className="inline-block rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          Agendar agora
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(178,60,60,0.3)',
            backgroundColor: 'rgba(178,60,60,0.08)',
            color: '#B23C3C',
          }}
        >
          {errorMessage}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl" style={{ color: '#1A1A1A' }}>
            Próximas reservas
          </h2>
          <span className="text-xs tracking-[0.18em] uppercase" style={{ color: '#5A5A5A' }}>
            {future.length} {future.length === 1 ? 'reserva' : 'reservas'}
          </span>
        </div>

        {future.length === 0 ? (
          <div
            className="rounded-lg border p-8 text-center text-sm"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(31,61,46,0.08)',
              color: '#5A5A5A',
            }}
          >
            Não tens reservas futuras agendadas.{' '}
            <Link
              href="/reservar"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: '#1F3D2E' }}
            >
              Agendar agora →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {future.map((booking) => (
              <BookingCard
                key={booking.bookingNumber}
                booking={booking}
                isPending={isPending && confirmingCancel === booking.bookingNumber}
                isConfirmingCancel={confirmingCancel === booking.bookingNumber}
                onRequestCancel={() => setConfirmingCancel(booking.bookingNumber)}
                onConfirmCancel={() => handleCancel(booking.bookingNumber)}
                onAbortCancel={() => setConfirmingCancel(null)}
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl" style={{ color: '#1A1A1A' }}>
              Histórico
            </h2>
            <span className="text-xs tracking-[0.18em] uppercase" style={{ color: '#5A5A5A' }}>
              {past.length} {past.length === 1 ? 'reserva' : 'reservas'}
            </span>
          </div>

          <div className="space-y-4">
            {past.map((booking) => (
              <BookingCard key={booking.bookingNumber} booking={booking} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// BookingCard
// ============================================================

type BookingCardProps = {
  booking: BookingForClient;
  isPast?: boolean;
  isPending?: boolean;
  isConfirmingCancel?: boolean;
  onRequestCancel?: () => void;
  onConfirmCancel?: () => void;
  onAbortCancel?: () => void;
};

function BookingCard({
  booking,
  isPast,
  isPending,
  isConfirmingCancel,
  onRequestCancel,
  onConfirmCancel,
  onAbortCancel,
}: BookingCardProps) {
  const dateFormat = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormat = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.08)',
        opacity: isPast && booking.status !== 'completed' ? 0.7 : 1,
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
              Reserva
            </p>
            <p className="font-mono text-sm" style={{ color: '#1F3D2E' }}>
              {booking.bookingNumber}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <h3 className="mb-3 font-serif text-xl capitalize" style={{ color: '#1A1A1A' }}>
          {dateFormat.format(new Date(booking.startTime))}
        </h3>

        <div className="space-y-2 text-sm" style={{ color: '#5A5A5A' }}>
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={1.5} style={{ color: '#D4AF6E' }} />
            <span>
              {timeFormat.format(new Date(booking.startTime))} · {booking.totalDuration} min
            </span>
          </div>

          {booking.staff && (
            <div className="flex items-center gap-2">
              <UserIcon size={14} strokeWidth={1.5} style={{ color: '#D4AF6E' }} />
              <span>com {booking.staff.name}</span>
            </div>
          )}
        </div>

        <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(31,61,46,0.08)' }}>
          <ul className="space-y-1 text-sm">
            {booking.services.map((s, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <span style={{ color: '#1A1A1A' }}>{s.name}</span>
                <span className="font-mono text-xs" style={{ color: '#5A5A5A' }}>
                  {(s.price / 100).toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>
          <div
            className="mt-3 flex items-center justify-between border-t pt-3"
            style={{ borderColor: 'rgba(31,61,46,0.08)' }}
          >
            <span className="text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
              Total
            </span>
            <span className="font-mono text-base font-semibold" style={{ color: '#1F3D2E' }}>
              {(booking.totalPrice / 100).toFixed(2)} €
            </span>
          </div>
        </div>

        {!isPast && booking.isCancellable && !isConfirmingCancel && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs" style={{ color: '#5A5A5A' }}>
              Cancelamento possível até 24h antes
            </p>
            <button
              type="button"
              onClick={onRequestCancel}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs tracking-wide transition-colors hover:bg-red-50"
              style={{ borderColor: 'rgba(178,60,60,0.3)', color: '#B23C3C' }}
            >
              <Trash2 size={14} strokeWidth={1.5} />
              Cancelar reserva
            </button>
          </div>
        )}

        {!isPast && !booking.isCancellable && booking.status !== 'cancelled' && (
          <div
            className="mt-4 rounded-md p-3 text-xs"
            style={{
              backgroundColor: 'rgba(212,175,110,0.08)',
              color: '#5A5A5A',
            }}
          >
            <AlertCircle
              size={14}
              strokeWidth={1.5}
              className="mr-2 inline-block"
              style={{ color: '#B8924A' }}
            />
            Cancelamento não disponível (faltam menos de 24h). Contacta o salão pelo +351 932 932
            691.
          </div>
        )}

        {isConfirmingCancel && (
          <div
            className="mt-4 rounded-md border p-4"
            style={{
              borderColor: 'rgba(178,60,60,0.3)',
              backgroundColor: 'rgba(178,60,60,0.05)',
            }}
          >
            <p className="mb-3 text-sm font-medium" style={{ color: '#B23C3C' }}>
              Tens a certeza que queres cancelar esta reserva?
            </p>
            <p className="mb-4 text-xs" style={{ color: '#5A5A5A' }}>
              Esta acção não pode ser desfeita. Se quiseres remarcar, terás de fazer uma nova
              reserva.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onConfirmCancel}
                disabled={isPending}
                className="rounded-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#B23C3C', color: '#FAF7F2' }}
              >
                {isPending ? 'A cancelar...' : 'Sim, cancelar'}
              </button>
              <button
                type="button"
                onClick={onAbortCancel}
                disabled={isPending}
                className="rounded-md border px-4 py-2 text-xs tracking-wide transition-colors hover:bg-white disabled:opacity-50"
                style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1A1A1A' }}
              >
                Manter reserva
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// StatusBadge
// ============================================================

type BadgeConfig = {
  label: string;
  bg: string;
  color: string;
  icon: ReactNode;
};

const STATUS_CONFIG: Record<BookingForClient['status'], BadgeConfig> = {
  pending: {
    label: 'Pendente',
    bg: 'rgba(212,175,110,0.15)',
    color: '#B8924A',
    icon: <Clock size={12} strokeWidth={2} />,
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'rgba(151,196,89,0.15)',
    color: '#5C8A2F',
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
  },
  'in-progress': {
    label: 'Em curso',
    bg: 'rgba(45,84,64,0.15)',
    color: '#1F3D2E',
    icon: <Clock size={12} strokeWidth={2} />,
  },
  completed: {
    label: 'Concluída',
    bg: 'rgba(31,61,46,0.1)',
    color: '#1F3D2E',
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'rgba(178,60,60,0.1)',
    color: '#B23C3C',
    icon: <XCircle size={12} strokeWidth={2} />,
  },
  'no-show': {
    label: 'Não compareceu',
    bg: 'rgba(90,90,90,0.1)',
    color: '#5A5A5A',
    icon: <XCircle size={12} strokeWidth={2} />,
  },
};

function StatusBadge({ status }: { status: BookingForClient['status'] }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
