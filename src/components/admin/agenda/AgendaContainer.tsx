// 📄 src/components/admin/agenda/AgendaContainer.tsx
'use client';

/**
 * Chi Sublime — Agenda Container (admin)
 * ============================================================
 *
 * MUDANCA: prefill do slot vazio implementado (era o TODO
 * "Sprint 5C parte 2") — clicar num slot vazio da vista de dia
 * abre o NewBookingModal ja com a hora e o profissional
 * preenchidos.
 */

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { BookingDetailModal } from './BookingDetailModal';
import { UpcomingListView } from './UpcomingListView';
import { NewBookingModal } from './NewBookingModal';
import {
  getBookingsByDayAction,
  getBookingsByWeekAction,
  getUpcomingBookingsAction,
  type AdminBookingForList,
} from '@/lib/server-actions/admin-bookings';

type AgendaContainerProps = {
  initialDate: string;
  initialView: 'day' | 'week' | 'list';
  initialBookings: AdminBookingForList[];
  staff: Array<{ id: string; name: string; photo?: string }>;
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    categorySlug?: string;
  }>;
  openNewModalInitially?: boolean;
};

type NewBookingPrefill = {
  time?: string;
  staffId?: string;
};

export function AgendaContainer({
  initialDate,
  initialView,
  initialBookings,
  staff,
  services,
  openNewModalInitially = false,
}: AgendaContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState<'day' | 'week' | 'list'>(initialView);
  const [bookings, setBookings] = useState(initialBookings);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingForList | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(openNewModalInitially);
  const [newBookingPrefill, setNewBookingPrefill] = useState<NewBookingPrefill | null>(null);

  const refresh = useCallback(async (newDate: string, newView: 'day' | 'week' | 'list') => {
    const result =
      newView === 'day'
        ? await getBookingsByDayAction(newDate)
        : newView === 'week'
          ? await getBookingsByWeekAction(newDate)
          : await getUpcomingBookingsAction(newDate);
    if (result.success) {
      setBookings(result.bookings);
    }
  }, []);

  function navigateToDate(newDate: string, newView?: 'day' | 'week' | 'list') {
    const v = newView ?? view;
    setDate(newDate);
    if (newView) setView(newView);

    // Atualiza URL sem reload
    const params = new URLSearchParams(searchParams);
    params.set('date', newDate);
    params.set('view', v);
    params.delete('new');
    router.replace(`/admin/reservas?${params.toString()}`);

    startTransition(async () => {
      await refresh(newDate, v);
    });
  }

  function handleViewChange(newView: 'day' | 'week' | 'list') {
    navigateToDate(date, newView);
  }

  function handlePrevDate() {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - (view === 'day' ? 1 : view === 'week' ? 7 : 14));
    navigateToDate(d.toISOString().slice(0, 10));
  }

  function handleNextDate() {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + (view === 'day' ? 1 : view === 'week' ? 7 : 14));
    navigateToDate(d.toISOString().slice(0, 10));
  }

  function handleToday() {
    navigateToDate(new Date().toISOString().slice(0, 10));
  }

  function handleRefresh() {
    startTransition(async () => {
      await refresh(date, view);
    });
  }

  function handleBookingChanged() {
    handleRefresh();
    setSelectedBooking(null);
  }

  function openNewBooking(prefill?: NewBookingPrefill) {
    setNewBookingPrefill(prefill ?? null);
    setNewBookingOpen(true);
  }

  function closeNewBooking() {
    setNewBookingOpen(false);
    setNewBookingPrefill(null);
  }

  function handleNewBookingCreated() {
    closeNewBooking();
    handleRefresh();
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Navegação datas */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-md border px-3 py-2 text-xs font-medium tracking-wide transition-colors hover:bg-white"
            style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1F3D2E' }}
          >
            Hoje
          </button>

          <div
            className="flex items-center rounded-md border"
            style={{ borderColor: 'rgba(31,61,46,0.2)' }}
          >
            <button
              type="button"
              onClick={handlePrevDate}
              aria-label="Anterior"
              className="rounded-l-md p-2 transition-colors hover:bg-white"
              style={{ color: '#1F3D2E' }}
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleNextDate}
              aria-label="Seguinte"
              className="rounded-r-md p-2 transition-colors hover:bg-white"
              style={{ borderLeft: '1px solid rgba(31,61,46,0.2)', color: '#1F3D2E' }}
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Date picker */}
          <input
            type="date"
            value={date}
            onChange={(e) => navigateToDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-white"
            style={{
              borderColor: 'rgba(31,61,46,0.2)',
              color: '#1F3D2E',
              backgroundColor: 'transparent',
            }}
          />

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            aria-label="Recarregar"
            className="border transition-colors hover:bg-white disabled:opacity-50"
            style={{
              padding: '8px',
              borderRadius: '8px',
              borderColor: 'rgba(31,61,46,0.2)',
              color: '#1F3D2E',
            }}
          >
            <RotateCw size={16} strokeWidth={1.5} className={isPending ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* View toggle + Nova reserva */}
        <div className="flex items-center gap-3">
          <div
            className="flex overflow-hidden border"
            style={{ borderRadius: '8px', borderColor: 'rgba(31,61,46,0.2)' }}
          >
            <button
              type="button"
              onClick={() => handleViewChange('day')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'day' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                backgroundColor: view === 'day' ? '#1F3D2E' : 'transparent',
                color: view === 'day' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('week')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'week' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                borderLeft: '1px solid rgba(31,61,46,0.2)',
                backgroundColor: view === 'week' ? '#1F3D2E' : 'transparent',
                color: view === 'week' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'list' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                borderLeft: '1px solid rgba(31,61,46,0.2)',
                backgroundColor: view === 'list' ? '#1F3D2E' : 'transparent',
                color: view === 'list' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Próximas
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewBooking()}
            className="inline-flex items-center text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px]"
            style={{
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              backgroundColor: '#D4AF6E',
              color: '#1F3D2E',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Nova reserva</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Hint: dia sem reservas → atalho para a lista de próximas */}
      {view === 'day' && bookings.length === 0 && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
          style={{
            borderColor: 'rgba(212,175,110,0.4)',
            backgroundColor: 'rgba(212,175,110,0.08)',
          }}
        >
          <p className="text-sm" style={{ color: '#5A4A2A' }}>
            Sem reservas neste dia — vê o que está agendado para os próximos dias.
          </p>
          <button
            type="button"
            onClick={() => handleViewChange('list')}
            className="text-xs font-semibold tracking-wide uppercase transition-all hover:-translate-y-[1px]"
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              backgroundColor: '#D4AF6E',
              color: '#1F3D2E',
            }}
          >
            Ver próximas reservas
          </button>
        </div>
      )}

      {/* Vista actual */}
      {view === 'day' ? (
        <CalendarDayView
          date={date}
          bookings={bookings}
          staff={staff}
          onBookingClick={setSelectedBooking}
          onEmptySlotClick={(time, staffId) => {
            // Prefill: abre o modal já com hora + profissional do slot clicado
            openNewBooking({ time, staffId });
          }}
        />
      ) : view === 'week' ? (
        <CalendarWeekView
          weekStart={date}
          bookings={bookings}
          onBookingClick={setSelectedBooking}
          onDayClick={(d) => navigateToDate(d, 'day')}
        />
      ) : (
        <UpcomingListView bookings={bookings} onBookingClick={setSelectedBooking} />
      )}

      {/* Modais */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={handleBookingChanged}
        />
      )}

      {newBookingOpen && (
        <NewBookingModal
          staff={staff}
          services={services}
          defaultDate={date}
          prefillTime={newBookingPrefill?.time}
          prefillStaffId={newBookingPrefill?.staffId}
          onClose={closeNewBooking}
          onCreated={handleNewBookingCreated}
        />
      )}
    </>
  );
}
