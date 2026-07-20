// 📄 src/components/admin/agenda/UpcomingListView.tsx
/**
 * Chi Sublime — Agenda: vista "Próximas"
 * ============================================================
 *
 * Lista cronológica das reservas ativas nos próximos dias,
 * agrupada por dia ("Hoje", "Amanhã", ou data por extenso).
 * Cada linha abre o BookingDetailModal (via onBookingClick),
 * tal como acontece nas vistas Dia/Semana.
 */

'use client';

import { Clock, Phone, Globe, User as UserIcon, CalendarX2 } from 'lucide-react';
import type { AdminBookingForList } from '@/lib/server-actions/admin-bookings';

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendente', bg: 'rgba(212,175,110,0.15)', text: '#7A5A2A' },
  confirmed: { label: 'Confirmada', bg: 'rgba(151,196,89,0.18)', text: '#3A5A1F' },
  'in-progress': { label: 'Em curso', bg: 'rgba(45,84,64,0.18)', text: '#1F3D2E' },
};

const dayLabelFmt = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const timeFmt = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function relativeDayLabel(key: string, date: Date): string {
  const today = dateKey(new Date());
  const tomorrow = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dateKey(t);
  })();
  const base = dayLabelFmt.format(date);
  if (key === today) return `Hoje · ${base}`;
  if (key === tomorrow) return `Amanhã · ${base}`;
  return base;
}

type UpcomingListViewProps = {
  bookings: AdminBookingForList[];
  onBookingClick: (booking: AdminBookingForList) => void;
};

export function UpcomingListView({ bookings, onBookingClick }: UpcomingListViewProps) {
  if (bookings.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border bg-white px-6 py-16 text-center"
        style={{ borderColor: 'rgba(31,61,46,0.08)' }}
      >
        <CalendarX2 size={32} strokeWidth={1.25} style={{ color: '#D4AF6E' }} />
        <p className="mt-4 font-serif text-lg" style={{ color: '#1A1A1A' }}>
          Sem reservas nos próximos 14 dias
        </p>
        <p className="mt-1 text-sm" style={{ color: '#5A5A5A' }}>
          As novas reservas online e manuais aparecem aqui automaticamente.
        </p>
      </div>
    );
  }

  // Agrupar por dia mantendo a ordem cronológica
  const groups: Array<{ key: string; label: string; items: AdminBookingForList[] }> = [];
  for (const b of bookings) {
    const start = new Date(b.startTime);
    const key = dateKey(start);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(b);
    } else {
      groups.push({ key, label: relativeDayLabel(key, start), items: [b] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3
              className="text-xs font-semibold tracking-[0.14em] uppercase"
              style={{ color: '#1F3D2E' }}
            >
              {group.label}
            </h3>
            <span className="text-xs" style={{ color: '#5A5A5A' }}>
              {group.items.length} {group.items.length === 1 ? 'reserva' : 'reservas'}
            </span>
          </div>

          <ul
            className="divide-y overflow-hidden rounded-lg border bg-white"
            style={{ borderColor: 'rgba(31,61,46,0.08)' }}
          >
            {group.items.map((b) => {
              const status = STATUS_META[b.status] ?? STATUS_META.pending;
              return (
                <li key={b.id} style={{ borderColor: 'rgba(31,61,46,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => onBookingClick(b)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212,175,110,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Hora */}
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 font-mono text-sm font-medium"
                      style={{ color: '#1F3D2E', minWidth: '3.5rem' }}
                    >
                      <Clock size={12} strokeWidth={1.75} style={{ color: '#D4AF6E' }} />
                      {timeFmt.format(new Date(b.startTime))}
                    </span>

                    {/* Cliente + serviços */}
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm font-medium"
                        style={{ color: '#1A1A1A' }}
                      >
                        {b.client.name}
                      </span>
                      <span className="block truncate text-xs" style={{ color: '#5A5A5A' }}>
                        {b.services.map((s) => s.name).join(', ')}
                      </span>
                    </span>

                    {/* Profissional */}
                    {b.staff && (
                      <span
                        className="hidden shrink-0 items-center gap-1 text-xs sm:inline-flex"
                        style={{ color: '#5A5A5A' }}
                      >
                        <UserIcon size={11} strokeWidth={1.75} />
                        {b.staff.name}
                      </span>
                    )}

                    {/* Origem (website/telefone) */}
                    <span className="hidden shrink-0 md:inline-flex" style={{ color: '#8A8A8A' }}>
                      {b.source === 'website' ? (
                        <Globe size={12} strokeWidth={1.75} aria-label="Reserva online" />
                      ) : b.source === 'phone' ? (
                        <Phone size={12} strokeWidth={1.75} aria-label="Reserva por telefone" />
                      ) : null}
                    </span>

                    {/* Estado */}
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>

                    {/* Preço */}
                    <span
                      className="hidden shrink-0 text-sm font-medium sm:inline"
                      style={{ color: '#1F3D2E', minWidth: '4.5rem', textAlign: 'right' }}
                    >
                      {euros(b.totalPrice)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
