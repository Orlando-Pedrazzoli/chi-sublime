'use client';

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { AdminBookingForList } from '@/lib/server-actions/admin-bookings';

type StatusColors = { bg: string; border: string; text: string };

const FALLBACK_COLORS: StatusColors = {
  bg: 'rgba(31,61,46,0.1)',
  border: '#5A5A5A',
  text: '#1F3D2E',
};

const WEEK_STATUS_COLORS: Record<string, StatusColors> = {
  pending: { bg: 'rgba(212,175,110,0.15)', border: '#D4AF6E', text: '#7A5A2A' },
  confirmed: { bg: 'rgba(151,196,89,0.18)', border: '#5C8A2F', text: '#3A5A1F' },
  'in-progress': { bg: 'rgba(45,84,64,0.2)', border: '#1F3D2E', text: '#1F3D2E' },
  completed: { bg: 'rgba(31,61,46,0.1)', border: '#5A5A5A', text: '#1F3D2E' },
  cancelled: { bg: 'rgba(178,60,60,0.1)', border: '#B23C3C', text: '#7A2828' },
  'no-show': { bg: 'rgba(90,90,90,0.1)', border: '#5A5A5A', text: '#5A5A5A' },
};

const WEEKDAYS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type CalendarWeekViewProps = {
  weekStart: string;
  bookings: AdminBookingForList[];
  onBookingClick: (booking: AdminBookingForList) => void;
  onDayClick: (date: string) => void;
};

export function CalendarWeekView({
  weekStart,
  bookings,
  onBookingClick,
  onDayClick,
}: CalendarWeekViewProps) {
  const days = useMemo(() => {
    const base = startOfWeek(new Date(`${weekStart}T12:00:00`));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, AdminBookingForList[]>();
    for (const d of days) map.set(toDateString(d), []);
    for (const b of bookings) {
      const key = toDateString(new Date(b.startTime));
      const list = map.get(key);
      if (list) list.push(b);
    }
    return map;
  }, [bookings, days]);

  const today = toDateString(new Date());

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
    >
      <div className="grid min-w-[840px] grid-cols-7">
        {days.map((day, idx) => {
          const dateStr = toDateString(day);
          const dayBookings = bookingsByDay.get(dateStr) ?? [];
          const isToday = dateStr === today;
          const isWeekend = idx === 5 || idx === 6;

          return (
            <DayColumn
              key={dateStr}
              date={day}
              weekdayLabel={WEEKDAYS_PT[idx]}
              bookings={dayBookings}
              isToday={isToday}
              isWeekend={isWeekend}
              onBookingClick={onBookingClick}
              onDayClick={() => onDayClick(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  weekdayLabel,
  bookings,
  isToday,
  isWeekend,
  onBookingClick,
  onDayClick,
}: {
  date: Date;
  weekdayLabel: string;
  bookings: AdminBookingForList[];
  isToday: boolean;
  isWeekend: boolean;
  onBookingClick: (b: AdminBookingForList) => void;
  onDayClick: () => void;
}) {
  const dayNum = date.getDate();

  return (
    <div
      className="flex flex-col"
      style={{
        borderRight: '1px solid rgba(31,61,46,0.06)',
        backgroundColor: isWeekend ? 'rgba(250,247,242,0.5)' : '#FFFFFF',
      }}
    >
      <button
        type="button"
        onClick={onDayClick}
        className="group flex items-center justify-between px-3 py-3 text-left transition-colors hover:bg-amber-50/30"
        style={{
          borderBottom: '1px solid rgba(31,61,46,0.08)',
          backgroundColor: isToday ? 'rgba(212,175,110,0.12)' : 'transparent',
        }}
      >
        <div>
          <p
            className="text-[10px] tracking-[0.22em] uppercase"
            style={{ color: isToday ? '#B8924A' : '#5A5A5A' }}
          >
            {weekdayLabel}
          </p>
          <p
            className="font-serif text-2xl leading-none"
            style={{ color: isToday ? '#1F3D2E' : '#1A1A1A' }}
          >
            {dayNum}
          </p>
        </div>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
          style={{ color: '#D4AF6E' }}
        />
      </button>

      <div className="flex flex-col gap-1 p-2" style={{ minHeight: 200 }}>
        {bookings.length === 0 ? (
          <p className="py-4 text-center text-[10px]" style={{ color: '#5A5A5A' }}>
            Sem reservas
          </p>
        ) : (
          bookings.map((b) => (
            <WeekBookingPill key={b.id} booking={b} onClick={() => onBookingClick(b)} />
          ))
        )}
      </div>

      {bookings.length > 0 && (
        <div
          className="px-3 py-2 text-center text-[10px] tracking-wide"
          style={{
            borderTop: '1px solid rgba(31,61,46,0.06)',
            color: '#5A5A5A',
          }}
        >
          {bookings.length} {bookings.length === 1 ? 'reserva' : 'reservas'}
        </div>
      )}
    </div>
  );
}

function WeekBookingPill({
  booking,
  onClick,
}: {
  booking: AdminBookingForList;
  onClick: () => void;
}) {
  const colors = WEEK_STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;
  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded border-l-2 px-2 py-1.5 text-left transition-all hover:translate-x-0.5"
      style={{ backgroundColor: colors.bg, borderLeftColor: colors.border }}
    >
      <p className="truncate font-mono text-[10px] font-semibold" style={{ color: colors.text }}>
        {timeFmt.format(new Date(booking.startTime))}
      </p>
      <p className="truncate text-[11px] leading-tight font-medium" style={{ color: colors.text }}>
        {booking.client.name}
      </p>
      <p
        className="truncate text-[10px] leading-tight italic opacity-70"
        style={{ color: colors.text }}
      >
        {booking.services[0]?.name}
      </p>
    </button>
  );
}
