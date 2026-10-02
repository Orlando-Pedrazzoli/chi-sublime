// 📄 src/components/admin/agenda/CalendarWeekView.tsx
'use client';

/**
 * Chi Sublime — Agenda: vista de semana (admin)
 * ============================================================
 *
 * FIX CRÍTICO (out. 2026) — marcações apareciam no DIA SEGUINTE.
 * As colunas eram Dates à meia-noite local e a chave de cada uma vinha
 * de `toISOString().slice(0, 10)`, que é UTC. No horário de verão,
 * meia-noite em Lisboa = 23:00 UTC da véspera, por isso a coluna
 * "Sáb 3" ficava com a chave "2026-10-02" e a marcação de sábado
 * (chave "2026-10-03") caía na coluna "Dom 4". O mesmo desvio
 * destacava o dia errado como "hoje" e abria o dia errado ao clicar
 * no cabeçalho. No inverno (Lisboa = UTC) o erro não se via.
 *
 * Agora cada coluna É uma string YYYY-MM-DD e o dia de cada marcação
 * é calculado no fuso do salão (lib/utils/salon-day.ts) — o resultado
 * é igual em qualquer telemóvel, computador ou servidor.
 */

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { AdminBookingForList } from '@/lib/server-actions/admin-bookings';
import { SALON_HOURS, SALON_TIMEZONE } from '@/lib/constants/business';
import { dayOfMonthISO, salonDayISO, weekDaysISO, weekdayOfISO } from '@/lib/utils/salon-day';

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

/** Hora da marcação SEMPRE em hora de Lisboa, seja qual for o dispositivo. */
const TIME_FMT = new Intl.DateTimeFormat('pt-PT', {
  timeZone: SALON_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type CalendarWeekViewProps = {
  /** Qualquer dia (YYYY-MM-DD) da semana a mostrar */
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
  // Segunda → Domingo, como strings YYYY-MM-DD (sem Dates, sem fusos)
  const days = useMemo(() => weekDaysISO(weekStart), [weekStart]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, AdminBookingForList[]>();
    for (const iso of days) map.set(iso, []);
    for (const b of bookings) {
      // Dia da marcação no fuso do salão — NUNCA toISOString() (UTC)
      const list = map.get(salonDayISO(b.startTime));
      if (list) list.push(b);
    }
    return map;
  }, [bookings, days]);

  const today = salonDayISO();

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
    >
      <div className="grid min-w-[840px] grid-cols-7">
        {days.map((dateStr, idx) => {
          const dayBookings = bookingsByDay.get(dateStr) ?? [];
          const isToday = dateStr === today;
          // Dia de encerramento do SALÃO — derivado de SALON_HOURS,
          // não de "é fim de semana". O salão fecha à segunda e abre
          // ao sábado; presumir sáb/dom sombreava o dia mais cheio.
          const isClosed = !SALON_HOURS[weekdayOfISO(dateStr)].open;

          return (
            <DayColumn
              key={dateStr}
              dayNum={dayOfMonthISO(dateStr)}
              weekdayLabel={WEEKDAYS_PT[idx]}
              bookings={dayBookings}
              isToday={isToday}
              isClosed={isClosed}
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
  dayNum,
  weekdayLabel,
  bookings,
  isToday,
  isClosed,
  onBookingClick,
  onDayClick,
}: {
  dayNum: number;
  weekdayLabel: string;
  bookings: AdminBookingForList[];
  isToday: boolean;
  isClosed: boolean;
  onBookingClick: (b: AdminBookingForList) => void;
  onDayClick: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        borderRight: '1px solid rgba(31,61,46,0.06)',
        backgroundColor: isClosed ? 'rgba(250,247,242,0.5)' : '#FFFFFF',
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
            Sem marcações
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
          {bookings.length} {bookings.length === 1 ? 'marcação' : 'marcações'}
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

  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded border-l-2 px-2 py-1.5 text-left transition-all hover:translate-x-0.5"
      style={{ backgroundColor: colors.bg, borderLeftColor: colors.border }}
    >
      <p className="truncate font-mono text-[10px] font-semibold" style={{ color: colors.text }}>
        {TIME_FMT.format(new Date(booking.startTime))}
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
