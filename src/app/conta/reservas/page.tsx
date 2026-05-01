import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireClient } from '@/lib/auth/permissions';
import { getMyBookingsAction } from '@/lib/server-actions/bookings';
import { MyBookings } from '@/components/client-area/MyBookings';

export const metadata: Metadata = {
  title: 'Reservas',
};

export default async function ClientBookingsPage() {
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

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 font-serif text-3xl" style={{ color: '#1A1A1A' }}>
            As minhas reservas
          </h2>
          <p className="text-sm" style={{ color: '#5A5A5A' }}>
            Vê e gere todas as tuas reservas no Chi Sublime.
          </p>
        </div>
        <Link
          href="/reservar"
          className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <Plus size={14} strokeWidth={1.5} />
          Nova reserva
        </Link>
      </div>

      <MyBookings bookings={result.bookings} />
    </div>
  );
}
