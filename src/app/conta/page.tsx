import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, ArrowRight, Plus, User as UserIcon } from 'lucide-react';
import { requireClient } from '@/lib/auth/permissions';
import { getMyBookingsAction, type BookingForClient } from '@/lib/server-actions/bookings';

export const metadata: Metadata = {
  title: 'Resumo',
};

export default async function ClientDashboardPage() {
  await requireClient();
  const result = await getMyBookingsAction();

  if (!result.success) {
    return (
      <div
        className="rounded-lg border p-8 text-sm"
        style={{
          backgroundColor: 'rgba(178,60,60,0.05)',
          borderColor: 'rgba(178,60,60,0.3)',
          color: '#B23C3C',
        }}
      >
        Erro ao carregar reservas: {result.error}
      </div>
    );
  }

  const { bookings } = result;
  const future = bookings.filter((b) => b.isFuture && b.status !== 'cancelled');
  const nextBooking = future[future.length - 1] ?? null;
  const totalCompleted = bookings.filter((b) => b.status === 'completed').length;
  const totalUpcoming = future.length;

  return (
    <div className="space-y-8">
      {nextBooking ? <NextBookingCard booking={nextBooking} /> : <NoUpcomingCard />}

      <section>
        <h2 className="mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          A tua experiência
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Próximas" value={totalUpcoming.toString()} />
          <StatCard label="Concluídas" value={totalCompleted.toString()} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          Acessos rápidos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickLink
            href="/conta/reservas"
            label="Ver todas as reservas"
            icon={<Calendar size={16} />}
          />
          <QuickLink href="/reservar" label="Nova reserva" icon={<Plus size={16} />} primary />
          <QuickLink href="/conta/perfil" label="Editar perfil" icon={<UserIcon size={16} />} />
        </div>
      </section>
    </div>
  );
}

function NextBookingCard({ booking }: { booking: BookingForClient }) {
  const dateFormat = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeFormat = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article
      className="overflow-hidden rounded-lg shadow-sm"
      style={{ backgroundColor: '#1F3D2E' }}
    >
      <div className="p-6 sm:p-8">
        <p className="mb-2 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#D4AF6E' }}>
          Próxima reserva
        </p>
        <h2
          className="mb-1 font-serif text-3xl capitalize sm:text-4xl"
          style={{ color: '#FAF7F2' }}
        >
          {dateFormat.format(new Date(booking.startTime))}
        </h2>
        <p className="mb-6 font-mono text-sm" style={{ color: 'rgba(250,247,242,0.7)' }}>
          às {timeFormat.format(new Date(booking.startTime))}
          {booking.staff && ` · com ${booking.staff.name}`}
        </p>

        <div className="mb-6 h-px" style={{ background: 'rgba(212,175,110,0.3)' }} />

        <ul className="mb-6 space-y-2">
          {booking.services.map((s, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between text-sm"
              style={{ color: '#FAF7F2' }}
            >
              <span>{s.name}</span>
              <span className="font-mono text-xs" style={{ color: 'rgba(250,247,242,0.6)' }}>
                {s.duration}min · {(s.price / 100).toFixed(2)} €
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/conta/reservas"
          className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
        >
          Ver detalhes
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function NoUpcomingCard() {
  return (
    <article
      className="rounded-lg border p-8 text-center"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.08)',
      }}
    >
      <Calendar size={40} strokeWidth={1} className="mx-auto mb-3" style={{ color: '#D4AF6E' }} />
      <h2 className="mb-2 font-serif text-2xl" style={{ color: '#1A1A1A' }}>
        Sem reservas agendadas
      </h2>
      <p className="mb-5 text-sm" style={{ color: '#5A5A5A' }}>
        Marca a tua próxima visita ao Chi Sublime.
      </p>
      <Link
        href="/reservar"
        className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
        style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
      >
        Agendar agora
        <ArrowRight size={14} />
      </Link>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
    >
      <p className="mb-1 text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
        {label}
      </p>
      <p className="font-serif text-3xl" style={{ color: '#1F3D2E' }}>
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon,
  primary,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md border px-5 py-4 transition-all hover:-translate-y-[1px] hover:shadow-md"
      style={{
        backgroundColor: primary ? '#1F3D2E' : '#FFFFFF',
        borderColor: primary ? '#1F3D2E' : 'rgba(31,61,46,0.1)',
        color: primary ? '#FAF7F2' : '#1A1A1A',
      }}
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        <span style={{ color: '#D4AF6E' }}>{icon}</span>
        {label}
      </span>
      <ArrowRight
        size={14}
        className="transition-transform group-hover:translate-x-1"
        style={{ color: '#D4AF6E' }}
      />
    </Link>
  );
}
