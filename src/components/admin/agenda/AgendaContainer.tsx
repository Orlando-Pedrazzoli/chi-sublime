'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { BookingDetailModal } from './BookingDetailModal';
import { NewBookingModal } from './NewBookingModal';
import {
  getBookingsByDayAction,
  getBookingsByWeekAction,
  type AdminBookingForList,
} from '@/lib/server-actions/admin-bookings';

type AgendaContainerProps = {
  initialDate: string;
  initialView: 'day' | 'week';
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
  const [view, setView] = useState<'day' | 'week'>(initialView);
  const [bookings, setBookings] = useState(initialBookings);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingForList | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(openNewModalInitially);

  const refresh = useCallback(async (newDate: string, newView: 'day' | 'week') => {
    const fn = newView === 'day' ? getBookingsByDayAction : getBookingsByWeekAction;
    const result = await fn(newDate);
    if (result.success) {
      setBookings(result.bookings);
    }
  }, []);

  function navigateToDate(newDate: string, newView?: 'day' | 'week') {
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

  function handleViewChange(newView: 'day' | 'week') {
    navigateToDate(date, newView);
  }

  function handlePrevDate() {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - (view === 'day' ? 1 : 7));
    navigateToDate(d.toISOString().slice(0, 10));
  }

  function handleNextDate() {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + (view === 'day' ? 1 : 7));
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

  function handleNewBookingCreated() {
    setNewBookingOpen(false);
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
            className="rounded-md border p-2 transition-colors hover:bg-white disabled:opacity-50"
            style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1F3D2E' }}
          >
            <RotateCw size={16} strokeWidth={1.5} className={isPending ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* View toggle + Nova reserva */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border" style={{ borderColor: 'rgba(31,61,46,0.2)' }}>
            <button
              type="button"
              onClick={() => handleViewChange('day')}
              className={cn(
                'rounded-l-md px-4 py-2 text-xs font-medium tracking-wide transition-colors',
                view === 'day' ? '' : 'hover:bg-white',
              )}
              style={{
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
                'rounded-r-md px-4 py-2 text-xs font-medium tracking-wide transition-colors',
                view === 'week' ? '' : 'hover:bg-white',
              )}
              style={{
                borderLeft: '1px solid rgba(31,61,46,0.2)',
                backgroundColor: view === 'week' ? '#1F3D2E' : 'transparent',
                color: view === 'week' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Semana
            </button>
          </div>

          <button
            type="button"
            onClick={() => setNewBookingOpen(true)}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px]"
            style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
          >
            <Plus size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Nova reserva</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Vista actual */}
      {view === 'day' ? (
        <CalendarDayView
          date={date}
          bookings={bookings}
          staff={staff}
          onBookingClick={setSelectedBooking}
          onEmptySlotClick={(time, staffId) => {
            // Pré-preencher modal com horário sugerido
            setNewBookingOpen(true);
            // (NewBookingModal vai aceitar prefill no Sprint 5C parte 2)
          }}
        />
      ) : (
        <CalendarWeekView
          weekStart={date}
          bookings={bookings}
          onBookingClick={setSelectedBooking}
          onDayClick={(d) => navigateToDate(d, 'day')}
        />
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
          onClose={() => setNewBookingOpen(false)}
          onCreated={handleNewBookingCreated}
        />
      )}
    </>
  );
}
