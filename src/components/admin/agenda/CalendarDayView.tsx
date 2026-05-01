'use client';

import { useMemo } from 'react';
import { Clock, User as UserIcon, Phone, Globe, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AdminBookingForList } from '@/lib/server-actions/admin-bookings';

type StatusColors = { bg: string; border: string; text: string };

const FALLBACK_COLORS: StatusColors = {
  bg: 'rgba(31,61,46,0.1)',
  border: '#5A5A5A',
  text: '#1F3D2E',
};

const STATUS_COLORS: Record<string, StatusColors> = {
  pending: { bg: 'rgba(212,175,110,0.15)', border: '#D4AF6E', text: '#7A5A2A' },
  confirmed: { bg: 'rgba(151,196,89,0.18)', border: '#5C8A2F', text: '#3A5A1F' },
  'in-progress': { bg: 'rgba(45,84,64,0.18)', border: '#1F3D2E', text: '#1F3D2E' },
  completed: { bg: 'rgba(31,61,46,0.1)', border: '#5A5A5A', text: '#1F3D2E' },
  cancelled: { bg: 'rgba(178,60,60,0.1)', border: '#B23C3C', text: '#7A2828' },
  'no-show': { bg: 'rgba(90,90,90,0.1)', border: '#5A5A5A', text: '#5A5A5A' },
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  website: <Globe size={10} strokeWidth={2} />,
  phone: <Phone size={10} strokeWidth={2} />,
  'walk-in': <UserIcon size={10} strokeWidth={2} />,
  instagram: <UserIcon size={10} strokeWidth={2} />,
  admin: <UserIcon size={10} strokeWidth={2} />,
};

type CalendarDayViewProps = {
  date: string;
  bookings: AdminBookingForList[];
  staff: Array<{ id: string; name: string; photo?: string }>;
  onBookingClick: (booking: AdminBookingForList) => void;
  onEmptySlotClick?: (time: string, staffId: string) => void;
};

const HOUR_START = 9;
const HOUR_END = 20;
const SLOT_HEIGHT = 80;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

export function CalendarDayView({
  bookings,
  staff,
  onBookingClick,
  onEmptySlotClick,
}: CalendarDayViewProps) {
  const bookingsByStaff = useMemo(() => {
    const map = new Map<string, AdminBookingForList[]>();
    for (const s of staff) map.set(s.id, []);
    map.set('unassigned', []);
    for (const b of bookings) {
      const sid = b.staff?.id ?? 'unassigned';
      const list = map.get(sid) ?? [];
      list.push(b);
      map.set(sid, list);
    }
    return map;
  }, [bookings, staff]);

  if (bookings.length === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
      >
        <Clock size={48} strokeWidth={1} className="mx-auto mb-4" style={{ color: '#D4AF6E' }} />
        <h3 className="mb-2 font-serif text-2xl" style={{ color: '#1A1A1A' }}>
          Sem reservas neste dia
        </h3>
        <p className="text-sm" style={{ color: '#5A5A5A' }}>
          Usa o botão Nova reserva para criar uma reserva manualmente.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
    >
      <div className="min-w-[640px]">
        <div
          className="sticky top-0 z-10 grid"
          style={{
            gridTemplateColumns: `60px repeat(${staff.length}, minmax(140px, 1fr))`,
            backgroundColor: '#1F3D2E',
          }}
        >
          <div />
          {staff.map((s) => (
            <div
              key={s.id}
              className="px-3 py-3 text-center"
              style={{ borderLeft: '1px solid rgba(212,175,110,0.2)' }}
            >
              <p
                className="text-[10px] tracking-[0.22em] uppercase"
                style={{ color: 'rgba(212,175,110,0.7)' }}
              >
                Staff
              </p>
              <p className="mt-0.5 truncate text-sm font-medium" style={{ color: '#FAF7F2' }}>
                {s.name}
              </p>
            </div>
          ))}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `60px repeat(${staff.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-[1]" style={{ backgroundColor: '#FAF7F2' }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-start justify-end px-2 pt-1 text-[10px]"
                style={{
                  height: SLOT_HEIGHT,
                  borderTop: '1px solid rgba(31,61,46,0.06)',
                  color: '#5A5A5A',
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {staff.map((s) => {
            const staffBookings = bookingsByStaff.get(s.id) ?? [];
            return (
              <StaffColumn
                key={s.id}
                staffId={s.id}
                bookings={staffBookings}
                onBookingClick={onBookingClick}
                onEmptySlotClick={onEmptySlotClick}
              />
            );
          })}
        </div>

        {(bookingsByStaff.get('unassigned')?.length ?? 0) > 0 && (
          <div className="border-t p-4" style={{ borderColor: 'rgba(31,61,46,0.08)' }}>
            <p className="mb-2 text-xs tracking-[0.22em] uppercase" style={{ color: '#B23C3C' }}>
              Reservas sem profissional
            </p>
            <div className="space-y-2">
              {bookingsByStaff.get('unassigned')?.map((b) => (
                <BookingPill key={b.id} booking={b} onClick={() => onBookingClick(b)} expanded />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StaffColumn({
  staffId,
  bookings,
  onBookingClick,
  onEmptySlotClick,
}: {
  staffId: string;
  bookings: AdminBookingForList[];
  onBookingClick: (b: AdminBookingForList) => void;
  onEmptySlotClick?: (time: string, staffId: string) => void;
}) {
  return (
    <div
      className="relative"
      style={{
        borderLeft: '1px solid rgba(31,61,46,0.06)',
        height: HOURS.length * SLOT_HEIGHT,
      }}
    >
      {HOURS.map((h) => (
        <div
          key={h}
          className="group relative cursor-pointer transition-colors hover:bg-amber-50/30"
          style={{
            height: SLOT_HEIGHT,
            borderTop: '1px solid rgba(31,61,46,0.06)',
          }}
          onClick={() => onEmptySlotClick?.(`${String(h).padStart(2, '0')}:00`, staffId)}
        >
          <Plus
            size={14}
            strokeWidth={1.5}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-40"
            style={{ color: '#1F3D2E' }}
          />
        </div>
      ))}

      {bookings.map((b) => (
        <BookingBlock key={b.id} booking={b} onClick={() => onBookingClick(b)} />
      ))}
    </div>
  );
}

function BookingBlock({ booking, onClick }: { booking: AdminBookingForList; onClick: () => void }) {
  const start = new Date(booking.startTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const top = (startHour - HOUR_START) * SLOT_HEIGHT;
  const height = (booking.totalDuration / 60) * SLOT_HEIGHT;

  if (top < 0) return null;
  if (top >= HOURS.length * SLOT_HEIGHT) return null;

  const colors = STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;
  const sourceIcon = SOURCE_ICONS[booking.source] ?? null;

  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-1 left-1 overflow-hidden rounded-md border-l-4 px-2 py-1.5 text-left shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md"
      style={{
        top,
        height: Math.max(height - 2, 24),
        backgroundColor: colors.bg,
        borderLeftColor: colors.border,
      }}
    >
      <div className="flex items-start gap-1">
        {sourceIcon ? (
          <span className="mt-0.5 shrink-0" style={{ color: colors.text }}>
            {sourceIcon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[11px] leading-tight font-semibold"
            style={{ color: colors.text }}
          >
            {booking.client.name}
          </p>
          <p
            className="truncate text-[10px] leading-tight opacity-80"
            style={{ color: colors.text }}
          >
            {timeFmt.format(start)} · {booking.totalDuration}min
          </p>
          {height > 50 ? (
            <p
              className="mt-1 truncate text-[10px] leading-tight italic opacity-70"
              style={{ color: colors.text }}
            >
              {booking.services[0]?.name}
              {booking.services.length > 1 ? ` +${booking.services.length - 1}` : ''}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function BookingPill({
  booking,
  onClick,
  expanded,
}: {
  booking: AdminBookingForList;
  onClick: () => void;
  expanded?: boolean;
}) {
  const colors = STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;
  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border-l-4 px-3 py-2 text-left transition-all hover:bg-white',
        expanded && 'shadow-sm',
      )}
      style={{ backgroundColor: colors.bg, borderLeftColor: colors.border }}
    >
      <span className="font-mono text-xs font-semibold" style={{ color: colors.text }}>
        {timeFmt.format(new Date(booking.startTime))}
      </span>
      <span className="flex-1 truncate text-sm" style={{ color: colors.text }}>
        {booking.client.name} · {booking.services[0]?.name}
      </span>
    </button>
  );
}
