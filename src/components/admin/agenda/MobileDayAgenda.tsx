// 📄 src/components/admin/agenda/MobileDayAgenda.tsx
'use client';

/**
 * Chi Sublime — Agenda do dia em MOBILE (< lg), tipo app
 * ============================================================
 *
 * Em telemóvel a grelha do desktop (uma coluna por profissional, com
 * scroll horizontal) não serve: obriga a arrastar para os lados e os
 * blocos ficam minúsculos. Aqui o dia é uma LISTA vertical:
 *
 *   [ Todos 7 ] [ Jean Pierre 3 ] [ Matias 3 ] [ Sofia · Férias ]
 *
 *   09:30   Bruna Exemplo                        Concluída
 *   10:30   Corte e brushing · 60 min           Por cobrar
 *   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ Agora 10:42 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
 *   ╌ Livre 10:30–11:00 · 30 min        + Marcar ╌
 *   11:00   Carla Demo                          Confirmada
 *
 *  - "Todos": todas as marcações do dia por ordem de hora, com o nome
 *    do profissional em cada cartão.
 *  - Um profissional: as marcações DELE, intercaladas com os intervalos
 *    LIVRES e as pausas. Tocar num intervalo livre abre a nova marcação
 *    já com a hora e o profissional — é o equivalente ao clique na
 *    grelha do desktop. Os intervalos vêm do mesmo `dayInfo` (horário
 *    do salão ∩ profissional), por isso respeitam folgas e férias.
 *  - Canceladas e faltas ficam numa secção à parte, no fim.
 *
 * Alvos de toque ≥ 44px; texto ≥ 13px; estilos em .agm-* (globals.css).
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Plus } from 'lucide-react';
import type { AdminBookingForList, AgendaDayInfo } from '@/lib/server-actions/admin-bookings';
import { salonDayISO, salonMinutesOfDay } from '@/lib/utils/salon-day';
import { BOOKING_RULES } from '@/lib/constants/business';
import { FALLBACK_COLORS, OFF_GRID, STATUS_COLORS, TIME_FMT } from './CalendarDayView';

type StaffLite = { id: string; name: string; photo?: string };

type MobileDayAgendaProps = {
  date: string;
  bookings: AdminBookingForList[];
  staff: StaffLite[];
  dayInfo?: AgendaDayInfo | null;
  onBookingClick: (booking: AdminBookingForList) => void;
  /** Intervalo livre tocado → nova marcação com hora + profissional */
  onEmptySlotClick?: (time: string, staffId: string) => void;
  /** Botão "Nova marcação" do estado vazio */
  onNewBooking?: () => void;
};

const ALL = 'all';
const SLOT = BOOKING_RULES.slotIntervalMinutes;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

type Row =
  | { kind: 'booking'; at: number; booking: AdminBookingForList }
  | { kind: 'free'; at: number; from: number; to: number; bookAt: number }
  | { kind: 'break'; at: number; from: number; to: number }
  | { kind: 'now'; at: number };

export function MobileDayAgenda({
  date,
  bookings,
  staff,
  dayInfo,
  onBookingClick,
  onEmptySlotClick,
  onNewBooking,
}: MobileDayAgendaProps) {
  const [selected, setSelected] = useState<string>(ALL);

  // Profissionais ativos + qualquer um (já inativo) com marcações no dia
  const people = useMemo(() => {
    const list: Array<StaffLite & { inactive?: boolean }> = staff.map((s) => ({ ...s }));
    const known = new Set(list.map((s) => s.id));
    for (const b of bookings) {
      if (b.staff && !known.has(b.staff.id)) {
        known.add(b.staff.id);
        list.push({ id: b.staff.id, name: b.staff.name, inactive: true });
      }
    }
    return list;
  }, [staff, bookings]);

  // Se o profissional escolhido deixar de existir (mudou o dia), volta a "Todos"
  const current = selected !== ALL && people.some((p) => p.id === selected) ? selected : ALL;

  const { active, offGrid } = useMemo(() => {
    const on: AdminBookingForList[] = [];
    const off: AdminBookingForList[] = [];
    for (const b of bookings) (OFF_GRID.has(b.status) ? off : on).push(b);
    return { active: on, offGrid: off };
  }, [bookings]);

  const countByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of active) {
      if (b.staff) map.set(b.staff.id, (map.get(b.staff.id) ?? 0) + 1);
    }
    return map;
  }, [active]);

  // "Agora" — só hoje; calculado no cliente e atualizado a cada minuto
  const today = salonDayISO();
  const isToday = date === today;
  const isPast = date < today;
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMin(date === salonDayISO() ? salonMinutesOfDay(new Date()) : null);
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [date]);

  const salonClosed = dayInfo ? !dayInfo.salon.open : false;
  const info = current !== ALL ? dayInfo?.staff[current] : undefined;
  const person = current !== ALL ? people.find((p) => p.id === current) : undefined;

  const rows = useMemo<Row[]>(() => {
    const mine = current === ALL ? active : active.filter((b) => b.staff?.id === current);
    const out: Row[] = mine.map((booking) => ({
      kind: 'booking',
      at: salonMinutesOfDay(booking.startTime),
      booking,
    }));

    // Intervalos livres e pausas — só com um profissional escolhido, a
    // trabalhar, num dia que não passou e com o salão aberto.
    const canBook =
      current !== ALL &&
      !isPast &&
      !salonClosed &&
      !person?.inactive &&
      info?.working &&
      info.start &&
      info.end;

    if (canBook && info?.start && info.end) {
      const windowStart = toMinutes(info.start);
      const windowEnd = toMinutes(info.end);

      const busy = [
        ...mine.map((b) => {
          const from = salonMinutesOfDay(b.startTime);
          return { from, to: from + b.totalDuration };
        }),
        ...info.breaks.map((b) => ({ from: toMinutes(b.start), to: toMinutes(b.end) })),
      ].sort((a, b) => a.from - b.from);

      for (const b of info.breaks) {
        out.push({
          kind: 'break',
          at: toMinutes(b.start),
          from: toMinutes(b.start),
          to: toMinutes(b.end),
        });
      }

      // Hoje, o que já passou não é "livre"
      const earliest = isToday && nowMin !== null ? Math.max(windowStart, nowMin) : windowStart;
      let cursor = windowStart;
      const pushFree = (from: number, to: number) => {
        const start = Math.max(from, earliest);
        // Primeiro início possível na grelha de 30 min
        const bookAt = Math.ceil(start / SLOT) * SLOT;
        if (to - bookAt >= SLOT) out.push({ kind: 'free', at: bookAt, from: bookAt, to, bookAt });
      };
      for (const b of busy) {
        if (b.from > cursor) pushFree(cursor, Math.min(b.from, windowEnd));
        cursor = Math.max(cursor, b.to);
      }
      if (cursor < windowEnd) pushFree(cursor, windowEnd);
    }

    if (isToday && nowMin !== null && out.length > 0) out.push({ kind: 'now', at: nowMin });

    // Em caso de empate: "agora" antes de tudo, marcação antes de livre
    const order = { now: 0, booking: 1, break: 2, free: 3 } as const;
    return out.sort((a, b) => a.at - b.at || order[a.kind] - order[b.kind]);
  }, [active, current, info, person, isPast, isToday, salonClosed, nowMin]);

  const hasBookings = rows.some((r) => r.kind === 'booking');
  const hasFree = rows.some((r) => r.kind === 'free');

  return (
    <div>
      {/* Equipa */}
      <div className="agm-chips admin-scroll-x" role="group" aria-label="Filtrar por profissional">
        <button
          type="button"
          className="agm-chip admin-press"
          aria-pressed={current === ALL}
          onClick={() => setSelected(ALL)}
        >
          Todos
          <span className="agm-chip-count">{active.length}</span>
        </button>
        {people.map((p) => {
          const staffInfo = dayInfo?.staff[p.id];
          const tag = p.inactive
            ? 'Inativo'
            : staffInfo && !staffInfo.working
              ? staffInfo.reason === 'vacation'
                ? 'Férias'
                : 'Folga'
              : null;
          const count = countByStaff.get(p.id) ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              className="agm-chip admin-press"
              aria-pressed={current === p.id}
              onClick={() => setSelected(p.id)}
            >
              {p.name}
              {tag ? <span className="agm-chip-tag">· {tag}</span> : null}
              {count > 0 || !tag ? <span className="agm-chip-count">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {salonClosed ? (
        <p className="agm-banner">
          <strong>Salão encerrado neste dia</strong>
          {dayInfo?.salon.closedDetail ? ` — ${dayInfo.salon.closedDetail}` : ''}. As clientes não
          conseguem marcar online.
        </p>
      ) : person && info && !info.working ? (
        <p className="agm-banner">
          <strong>{person.name}</strong> está de {info.reason === 'vacation' ? 'férias' : 'folga'}{' '}
          neste dia.
        </p>
      ) : person && info?.start && info.end ? (
        <p className="agm-note" style={{ marginBottom: '10px' }}>
          Horário de {person.name}: {info.start}–{info.end}
        </p>
      ) : null}

      {!hasBookings && !hasFree ? (
        <div className="agm-empty">
          <p className="font-serif" style={{ fontSize: '20px', color: '#1A1A1A' }}>
            Sem marcações {person ? `para ${person.name}` : 'neste dia'}
          </p>
          <p style={{ marginTop: '6px', fontSize: '14px', color: '#5A5A5A' }}>
            {current === ALL && !isPast && !salonClosed
              ? 'Escolhe um profissional para ver os horários livres.'
              : 'Nada agendado.'}
          </p>
          {onNewBooking && !isPast ? (
            <button type="button" className="agm-primary admin-press" onClick={onNewBooking}>
              <CalendarPlus size={18} strokeWidth={2} />
              Nova marcação
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="agm-list">
          {rows.map((row) => {
            if (row.kind === 'booking') {
              return (
                <li key={row.booking.id}>
                  <BookingCard
                    booking={row.booking}
                    showStaff={current === ALL}
                    onClick={() => onBookingClick(row.booking)}
                  />
                </li>
              );
            }
            if (row.kind === 'now') {
              return (
                <li key="now" className="agm-note" data-now="true" aria-label="Hora atual">
                  Agora {toHHMM(row.at)}
                </li>
              );
            }
            if (row.kind === 'break') {
              return (
                <li key={`break-${row.from}`} className="agm-note">
                  Pausa {toHHMM(row.from)}–{toHHMM(row.to)}
                </li>
              );
            }
            return (
              <li key={`free-${row.from}`}>
                <button
                  type="button"
                  className="agm-free"
                  disabled={!onEmptySlotClick}
                  onClick={() => onEmptySlotClick?.(toHHMM(row.bookAt), current)}
                  aria-label={`Nova marcação às ${toHHMM(row.bookAt)} com ${person?.name ?? ''}`}
                >
                  <span>
                    <strong>Livre</strong> {toHHMM(row.from)}–{toHHMM(row.to)}
                    <span style={{ color: '#8A8A84' }}> · {durationLabel(row.to - row.from)}</span>
                  </span>
                  <span className="agm-free-cta">
                    <Plus size={16} strokeWidth={2.25} />
                    Marcar
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {offGrid.length > 0 ? (
        <>
          <p className="agm-section-title">Canceladas e faltas ({offGrid.length})</p>
          <ul className="agm-list">
            {offGrid.map((b) => (
              <li key={b.id}>
                <BookingCard booking={b} showStaff muted onClick={() => onBookingClick(b)} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

// ============================================================
// Cartão de marcação
// ============================================================

function BookingCard({
  booking,
  showStaff,
  muted,
  onClick,
}: {
  booking: AdminBookingForList;
  showStaff?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  const colors = STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;
  const unpaid = booking.status === 'completed' && !booking.transactionId;
  const services =
    booking.services.length > 1
      ? `${booking.services[0]?.name} +${booking.services.length - 1}`
      : (booking.services[0]?.name ?? '');

  return (
    <button
      type="button"
      onClick={onClick}
      className="agm-card admin-press"
      style={{ opacity: muted ? 0.75 : 1 }}
    >
      <span aria-hidden className="agm-card-bar" style={{ backgroundColor: colors.border }} />
      <span className="agm-card-time">
        <span className="agm-card-start">{TIME_FMT.format(new Date(booking.startTime))}</span>
        <span className="agm-card-end">{TIME_FMT.format(new Date(booking.endTime))}</span>
      </span>
      <span className="agm-card-body">
        <span className="agm-card-name">{booking.client.name}</span>
        <span className="agm-card-sub">{services}</span>
        <span className="agm-card-sub" style={{ color: '#8A8A84' }}>
          {[
            showStaff ? (booking.staff?.name ?? 'Sem profissional') : null,
            durationLabel(booking.totalDuration),
            euros(booking.totalPrice),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="agm-card-side">
        <span className="agm-pill" style={{ backgroundColor: colors.bg, color: colors.text }}>
          {colors.label}
        </span>
        {unpaid ? (
          <span className="agm-pill" style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}>
            Por cobrar
          </span>
        ) : null}
      </span>
    </button>
  );
}
