// 📄 src/app/admin/reservas/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { AgendaContainer } from '@/components/admin/agenda/AgendaContainer';
import {
  getBookingsByDayAction,
  getBookingsByWeekAction,
  getUpcomingBookingsAction,
  getAdminBookingMetaAction,
} from '@/lib/server-actions/admin-bookings';

export const metadata: Metadata = {
  title: 'Reservas',
  robots: { index: false, follow: false },
};

type SearchParams = {
  date?: string;
  view?: 'day' | 'week' | 'list';
  new?: string;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayString();
  const view: 'day' | 'week' | 'list' =
    params.view === 'week' ? 'week' : params.view === 'list' ? 'list' : 'day';
  const openNewModal = params.new === '1';

  const [bookingsResult, meta] = await Promise.all([
    view === 'day'
      ? getBookingsByDayAction(date)
      : view === 'week'
        ? getBookingsByWeekAction(date)
        : getUpcomingBookingsAction(date),
    getAdminBookingMetaAction(),
  ]);

  if (!bookingsResult.success) {
    return (
      <div
        className="rounded-lg border p-8 text-sm"
        style={{
          backgroundColor: 'rgba(178,60,60,0.05)',
          borderColor: 'rgba(178,60,60,0.3)',
          color: '#B23C3C',
        }}
      >
        Erro ao carregar reservas: {bookingsResult.error}
      </div>
    );
  }

  return (
    <AgendaContainer
      initialDate={date}
      initialView={view}
      initialBookings={bookingsResult.bookings}
      staff={meta.staff}
      services={meta.services}
      openNewModalInitially={openNewModal}
    />
  );
}
