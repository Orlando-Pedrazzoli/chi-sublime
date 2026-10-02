// 📄 src/app/admin/marcacoes/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { AgendaContainer } from '@/components/admin/agenda/AgendaContainer';
import {
  getBookingsByDayAction,
  getBookingsByWeekAction,
  getUpcomingBookingsAction,
  getAdminBookingMetaAction,
} from '@/lib/server-actions/admin-bookings';
import { isISODay, salonDayISO } from '@/lib/utils/salon-day';

export const metadata: Metadata = {
  title: 'Marcações',
  robots: { index: false, follow: false },
};

type SearchParams = {
  date?: string;
  view?: 'day' | 'week' | 'list';
  new?: string;
};

export default async function AdminMarcacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  // Sem ?date= válido → hoje EM LISBOA. (toISOString() dava o dia UTC do
  // servidor: entre a meia-noite e a 01:00 no verão abria a agenda de ontem.)
  const date = isISODay(params.date) ? params.date : salonDayISO();
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
        Erro ao carregar marcações: {bookingsResult.error}
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
      categories={meta.categories}
      openNewModalInitially={openNewModal}
    />
  );
}
