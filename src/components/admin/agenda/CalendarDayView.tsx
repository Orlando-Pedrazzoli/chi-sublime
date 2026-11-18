// 📄 src/components/admin/agenda/CalendarDayView.tsx
'use client';

/**
 * Chi Sublime — Agenda: vista de dia (admin)
 * ============================================================
 *
 * REVISÃO (nov. 2026) — o que mudou e porquê:
 *
 *  - A GRELHA APARECE SEMPRE. Um dia sem marcações mostrava só um
 *    cartão "Sem marcações": não dava para clicar num horário livre
 *    — precisamente no dia em que há mais horários livres.
 *  - Clique num horário livre com precisão de 30 min (era sempre a
 *    hora certa: clicar às 10:40 abria o modal às 10:00).
 *  - Sombreado do que NÃO é marcável: salão fechado/feriado, folga,
 *    férias, antes/depois do expediente e pausas. Vem de `dayInfo`
 *    (o mesmo motor que o site usa), por isso o que está a cinzento é
 *    o que a cliente não consegue marcar. O admin continua a poder
 *    clicar (encaixe forçado).
 *  - Linha "agora" no dia de hoje.
 *  - Canceladas e faltas saem da grelha para uma lista por baixo: não
 *    ocupam o horário, e ficavam por cima da marcação que as substituiu.
 *  - Marcações sobrepostas (ex.: uma concluída mais cedo e um walk-in
 *    na mesma hora) dividem a coluna lado a lado em vez de se taparem.
 *
 *  Esta grelha é a vista de DESKTOP (≥ lg). Em telemóvel/tablet a
 *  agenda do dia é a <MobileDayAgenda /> (lista vertical tipo app).
 *
 *  BUGS CORRIGIDOS:
 *  - Marcações de um profissional entretanto DESATIVADO não apareciam
 *    em lado nenhum (a coluna não existia). Agora ganham coluna.
 *  - Marcações fora da grelha horária (encaixe forçado às 08:00 ou às
 *    20:00) eram simplesmente omitidas. A grelha estica para as mostrar.
 */

import { useEffect, useMemo, useState } from 'react';
import { Globe, Phone, User as UserIcon } from 'lucide-react';
import type { AdminBookingForList, AgendaDayInfo } from '@/lib/server-actions/admin-bookings';
import { SALON_TIMEZONE, salonHoursBounds } from '@/lib/constants/business';
import { salonDayISO, salonMinutesOfDay } from '@/lib/utils/salon-day';

export type StatusColors = { bg: string; border: string; text: string; label: string };

export const FALLBACK_COLORS: StatusColors = {
  bg: 'rgba(31,61,46,0.1)',
  border: '#5A5A5A',
  text: '#1F3D2E',
  label: '',
};

/** Fundos OPACOS: os blocos ficam por cima do sombreado e da linha "agora". */
export const STATUS_COLORS: Record<string, StatusColors> = {
  pending: { bg: '#F8F1E2', border: '#D4AF6E', text: '#7A5A2A', label: 'Pendente' },
  confirmed: { bg: '#EAF3DC', border: '#5C8A2F', text: '#3A5A1F', label: 'Confirmada' },
  'in-progress': { bg: '#D5DFD9', border: '#1F3D2E', text: '#1F3D2E', label: 'Em curso' },
  completed: { bg: '#ECEFED', border: '#5A5A5A', text: '#1F3D2E', label: 'Concluída' },
  cancelled: { bg: '#F7E9E9', border: '#B23C3C', text: '#7A2828', label: 'Cancelada' },
  'no-show': { bg: '#EEEEEE', border: '#5A5A5A', text: '#5A5A5A', label: 'Não compareceu' },
};

const LEGEND: string[] = ['pending', 'confirmed', 'in-progress', 'completed'];

/** Estados que não ocupam o horário — saem da grelha para a lista de baixo */
export const OFF_GRID = new Set<string>(['cancelled', 'no-show']);

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  website: <Globe size={10} strokeWidth={2} />,
  phone: <Phone size={10} strokeWidth={2} />,
  'walk-in': <UserIcon size={10} strokeWidth={2} />,
  instagram: <UserIcon size={10} strokeWidth={2} />,
  admin: <UserIcon size={10} strokeWidth={2} />,
};

type StaffColumnInfo = { id: string; name: string; photo?: string; inactive?: boolean };

type CalendarDayViewProps = {
  date: string;
  bookings: AdminBookingForList[];
  staff: Array<{ id: string; name: string; photo?: string }>;
  /** Horário do salão e de cada profissional neste dia (sombreado) */
  dayInfo?: AgendaDayInfo | null;
  onBookingClick: (booking: AdminBookingForList) => void;
  onEmptySlotClick?: (time: string, staffId: string) => void;
};

/**
 * Grelha horária derivada de SALON_HOURS + 1h de folga no fim, para uma
 * marcação que termine à hora de fecho continuar visível. Nunca
 * hardcoded: se o horário do salão mudar, a agenda acompanha.
 */
const { earliestHour, latestHour } = salonHoursBounds();
const DEFAULT_HOUR_START = earliestHour;
const DEFAULT_HOUR_END = latestHour + 1;
/** Altura de 1 hora (px). Cada meia hora = metade. */
const HOUR_HEIGHT = 80;
const GRID_COLUMNS = (n: number) => `56px repeat(${Math.max(n, 1)}, minmax(150px, 1fr))`;

const HATCH =
  'repeating-linear-gradient(135deg, rgba(31,61,46,0.07) 0px, rgba(31,61,46,0.07) 6px, rgba(31,61,46,0.025) 6px, rgba(31,61,46,0.025) 12px)';

/**
 * Hora SEMPRE em hora de Lisboa. Sem `timeZone`, a hora (e a posição do
 * bloco na grelha) dependiam do fuso do dispositivo.
 */
export const TIME_FMT = new Intl.DateTimeFormat('pt-PT', {
  timeZone: SALON_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// ============================================================
// Layout de sobreposições (faixas lado a lado)
// ============================================================

type Placed = {
  booking: AdminBookingForList;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

/**
 * Distribui as marcações de uma coluna por faixas: as que se sobrepõem
 * ficam lado a lado. Sem sobreposições (o caso normal) cada marcação
 * ocupa a coluna inteira.
 */
function placeBookings(bookings: AdminBookingForList[]): Placed[] {
  const items = bookings
    .map((booking) => {
      const startMin = salonMinutesOfDay(booking.startTime);
      return { booking, startMin, endMin: startMin + Math.max(booking.totalDuration, 15) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    const lanes = cluster.reduce((max, p) => Math.max(max, p.lane + 1), 1);
    for (const p of cluster) p.lanes = lanes;
    placed.push(...cluster);
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) closeCluster();

    // Primeira faixa livre dentro do grupo
    let lane = 0;
    while (cluster.some((p) => p.lane === lane && p.endMin > item.startMin)) lane += 1;

    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length > 0) closeCluster();

  return placed;
}

// ============================================================
// Componente
// ============================================================

export function CalendarDayView({
  date,
  bookings,
  staff,
  dayInfo,
  onBookingClick,
  onEmptySlotClick,
}: CalendarDayViewProps) {
  // Colunas: profissionais ativos + qualquer profissional (já inativo)
  // que tenha marcações neste dia — senão essas marcações desapareciam.
  const columns = useMemo<StaffColumnInfo[]>(() => {
    const cols: StaffColumnInfo[] = staff.map((s) => ({ ...s }));
    const known = new Set(cols.map((c) => c.id));
    for (const b of bookings) {
      if (b.staff && !known.has(b.staff.id)) {
        known.add(b.staff.id);
        cols.push({ id: b.staff.id, name: b.staff.name, photo: b.staff.photo, inactive: true });
      }
    }
    return cols;
  }, [staff, bookings]);

  const { gridByStaff, offGrid, unassigned } = useMemo(() => {
    const byStaff = new Map<string, AdminBookingForList[]>();
    const off: AdminBookingForList[] = [];
    const none: AdminBookingForList[] = [];
    for (const b of bookings) {
      if (OFF_GRID.has(b.status)) {
        off.push(b);
      } else if (!b.staff) {
        none.push(b);
      } else {
        const list = byStaff.get(b.staff.id) ?? [];
        list.push(b);
        byStaff.set(b.staff.id, list);
      }
    }
    return { gridByStaff: byStaff, offGrid: off, unassigned: none };
  }, [bookings]);

  // A grelha estica para mostrar marcações fora do horário habitual
  const { hourStart, hours } = useMemo(() => {
    let start = DEFAULT_HOUR_START;
    let end = DEFAULT_HOUR_END;
    for (const list of gridByStaff.values()) {
      for (const b of list) {
        const startMin = salonMinutesOfDay(b.startTime);
        start = Math.min(start, Math.floor(startMin / 60));
        end = Math.max(end, Math.ceil((startMin + b.totalDuration) / 60));
      }
    }
    start = Math.max(0, start);
    end = Math.min(24, Math.max(end, start + 1));
    return {
      hourStart: start,
      hours: Array.from({ length: end - start }, (_, i) => start + i),
    };
  }, [gridByStaff]);

  const gridStartMin = hourStart * 60;
  const gridEndMin = gridStartMin + hours.length * 60;
  const gridHeight = hours.length * HOUR_HEIGHT;
  const toPx = (minutes: number) => ((minutes - gridStartMin) / 60) * HOUR_HEIGHT;

  // Linha "agora" — só no dia de hoje. Calculada no cliente (evita
  // divergência de hidratação) e atualizada a cada minuto.
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMin(date === salonDayISO() ? salonMinutesOfDay(new Date()) : null);
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [date]);
  const showNow = nowMin !== null && nowMin >= gridStartMin && nowMin <= gridEndMin;

  const salonClosed = dayInfo ? !dayInfo.salon.open : false;
  const activeCount = bookings.length - offGrid.length;

  return (
    <div>
      {/* Realce do horário sob o cursor (sem depender de classes Tailwind) */}
      <style>{`
        .chi-agenda-slot:not(:disabled):hover,
        .chi-agenda-slot:not(:disabled):focus-visible {
          background: rgba(212,175,110,0.16) !important;
          outline: none;
        }
      `}</style>

      {/* Legenda + resumo do dia */}
      <div
        className="flex flex-wrap items-center"
        style={{ gap: '8px 16px', marginBottom: '12px', fontSize: '12px', color: '#5A5A5A' }}
      >
        <span style={{ fontWeight: 600, color: '#1F3D2E' }}>
          {activeCount === 0
            ? 'Sem marcações neste dia'
            : `${activeCount} ${activeCount === 1 ? 'marcação' : 'marcações'}`}
        </span>
        {LEGEND.map((status) => (
          <span key={status} className="inline-flex items-center" style={{ gap: '6px' }}>
            <span
              aria-hidden
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: STATUS_COLORS[status].bg,
                border: `1px solid ${STATUS_COLORS[status].border}`,
              }}
            />
            {STATUS_COLORS[status].label}
          </span>
        ))}
        <span className="inline-flex items-center" style={{ gap: '6px' }}>
          <span
            aria-hidden
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '3px',
              backgroundImage: HATCH,
              border: '1px solid rgba(31,61,46,0.2)',
            }}
          />
          Fora do horário
        </span>
      </div>

      {salonClosed && (
        <div
          className="rounded-lg border text-sm"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderColor: 'rgba(31,61,46,0.15)',
            backgroundColor: 'rgba(31,61,46,0.04)',
            color: '#1F3D2E',
          }}
        >
          <strong>Salão encerrado neste dia</strong>
          {dayInfo?.salon.closedDetail ? ` — ${dayInfo.salon.closedDetail}` : ''}. As clientes não
          conseguem marcar online; podes criar um encaixe forçado clicando na grelha.
        </div>
      )}

      <div
        className="overflow-x-auto rounded-lg border"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
      >
        <div style={{ minWidth: `${56 + Math.max(columns.length, 1) * 150}px` }}>
          {/* Cabeçalho: uma coluna por profissional */}
          <div
            className="sticky top-0 z-10 grid"
            style={{
              gridTemplateColumns: GRID_COLUMNS(columns.length),
              backgroundColor: '#1F3D2E',
            }}
          >
            <div />
            {columns.map((s) => {
              const info = dayInfo?.staff[s.id];
              const tag = s.inactive
                ? 'Inativo'
                : info && !info.working
                  ? info.reason === 'vacation'
                    ? 'Férias'
                    : 'Folga'
                  : info?.start && info.end
                    ? `${info.start}–${info.end}`
                    : null;
              const count = gridByStaff.get(s.id)?.length ?? 0;
              return (
                <div
                  key={s.id}
                  className="text-center"
                  style={{ padding: '10px 12px', borderLeft: '1px solid rgba(212,175,110,0.2)' }}
                >
                  <p className="truncate text-sm font-medium" style={{ color: '#FAF7F2' }}>
                    {s.name}
                  </p>
                  <p
                    className="truncate"
                    style={{
                      marginTop: '2px',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: 'rgba(212,175,110,0.85)',
                    }}
                  >
                    {[tag, count > 0 ? `${count} marc.` : null].filter(Boolean).join(' · ') || ' '}
                  </p>
                </div>
              );
            })}
            {columns.length === 0 && (
              <div className="text-sm" style={{ padding: '12px', color: '#FAF7F2' }}>
                Sem profissionais ativos — adiciona-os em Equipa.
              </div>
            )}
          </div>

          {/* Corpo */}
          <div
            className="relative grid"
            style={{ gridTemplateColumns: GRID_COLUMNS(columns.length) }}
          >
            {/* Régua das horas */}
            <div className="sticky left-0 z-[3]" style={{ backgroundColor: '#FAF7F2' }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end"
                  style={{
                    height: HOUR_HEIGHT,
                    padding: '4px 8px 0',
                    fontSize: '10px',
                    borderTop: '1px solid rgba(31,61,46,0.06)',
                    color: '#5A5A5A',
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {columns.map((s) => {
              const info = dayInfo?.staff[s.id];
              return (
                <StaffColumn
                  key={s.id}
                  staff={s}
                  hours={hours}
                  gridHeight={gridHeight}
                  toPx={toPx}
                  unavailable={unavailableRanges({
                    info,
                    salonClosed,
                    inactive: Boolean(s.inactive),
                    gridStartMin,
                    gridEndMin,
                  })}
                  placed={placeBookings(gridByStaff.get(s.id) ?? [])}
                  onBookingClick={onBookingClick}
                  onEmptySlotClick={onEmptySlotClick}
                />
              );
            })}

            {/* Linha "agora" */}
            {showNow && nowMin !== null && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 z-[2]"
                style={{
                  left: '56px',
                  top: toPx(nowMin),
                  height: 0,
                  borderTop: '2px solid #B23C3C',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '-5px',
                    top: '-6px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '9999px',
                    backgroundColor: '#B23C3C',
                  }}
                />
              </div>
            )}
          </div>

          {unassigned.length > 0 && (
            <div
              className="border-t"
              style={{ padding: '16px', borderColor: 'rgba(31,61,46,0.08)' }}
            >
              <p
                className="text-xs tracking-[0.22em] uppercase"
                style={{ marginBottom: '8px', color: '#B23C3C' }}
              >
                Marcações sem profissional
              </p>
              <div className="flex flex-col" style={{ gap: '8px' }}>
                {unassigned.map((b) => (
                  <BookingPill key={b.id} booking={b} onClick={() => onBookingClick(b)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canceladas e faltas: não ocupam o horário, ficam fora da grelha */}
      {offGrid.length > 0 && (
        <div
          className="rounded-lg border"
          style={{
            marginTop: '12px',
            padding: '14px 16px',
            backgroundColor: '#FFFFFF',
            borderColor: 'rgba(31,61,46,0.08)',
          }}
        >
          <p
            className="text-xs tracking-[0.18em] uppercase"
            style={{ marginBottom: '8px', color: '#5A5A5A' }}
          >
            Canceladas e faltas neste dia ({offGrid.length}) — o horário ficou livre
          </p>
          <div className="flex flex-col" style={{ gap: '8px' }}>
            {offGrid.map((b) => (
              <BookingPill key={b.id} booking={b} onClick={() => onBookingClick(b)} showStatus />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sombreado: intervalos (em minutos) em que a coluna não é marcável
// ============================================================

type Range = { from: number; to: number };

function unavailableRanges({
  info,
  salonClosed,
  inactive,
  gridStartMin,
  gridEndMin,
}: {
  info: AgendaDayInfo['staff'][string] | undefined;
  salonClosed: boolean;
  inactive: boolean;
  gridStartMin: number;
  gridEndMin: number;
}): Range[] {
  const whole: Range[] = [{ from: gridStartMin, to: gridEndMin }];
  if (inactive || salonClosed) return whole;
  if (!info) return []; // sem dados de horário: não sombrear às cegas
  if (!info.working || !info.start || !info.end) return whole;

  const ranges: Range[] = [
    { from: gridStartMin, to: hhmmToMinutes(info.start) },
    { from: hhmmToMinutes(info.end), to: gridEndMin },
    ...info.breaks.map((b) => ({ from: hhmmToMinutes(b.start), to: hhmmToMinutes(b.end) })),
  ];

  return ranges
    .map((r) => ({ from: Math.max(r.from, gridStartMin), to: Math.min(r.to, gridEndMin) }))
    .filter((r) => r.to > r.from);
}

// ============================================================
// Coluna de um profissional
// ============================================================

function StaffColumn({
  staff,
  hours,
  gridHeight,
  toPx,
  unavailable,
  placed,
  onBookingClick,
  onEmptySlotClick,
}: {
  staff: StaffColumnInfo;
  hours: number[];
  gridHeight: number;
  toPx: (minutes: number) => number;
  unavailable: Range[];
  placed: Placed[];
  onBookingClick: (b: AdminBookingForList) => void;
  onEmptySlotClick?: (time: string, staffId: string) => void;
}) {
  // Um profissional inativo não pode receber marcações novas
  const clickable = Boolean(onEmptySlotClick) && !staff.inactive;

  return (
    <div
      className="relative"
      style={{ borderLeft: '1px solid rgba(31,61,46,0.06)', height: gridHeight }}
    >
      {/* Horários clicáveis — 2 por hora (grelha de 30 min) */}
      {hours.map((h) =>
        [0, 30].map((m) => {
          const time = minutesToHHMM(h * 60 + m);
          return (
            <button
              key={time}
              type="button"
              disabled={!clickable}
              onClick={() => onEmptySlotClick?.(time, staff.id)}
              aria-label={`Nova marcação às ${time} com ${staff.name}`}
              title={clickable ? `Nova marcação · ${time} · ${staff.name}` : undefined}
              className="chi-agenda-slot block w-full"
              style={{
                height: HOUR_HEIGHT / 2,
                padding: 0,
                background: 'transparent',
                borderTop:
                  m === 0 ? '1px solid rgba(31,61,46,0.06)' : '1px dashed rgba(31,61,46,0.04)',
                cursor: clickable ? 'pointer' : 'default',
              }}
            />
          );
        }),
      )}

      {/* Sombreado — não intercepta cliques (o admin pode forçar um encaixe) */}
      {unavailable.map((r) => (
        <div
          key={`${r.from}-${r.to}`}
          aria-hidden
          className="pointer-events-none absolute right-0 left-0"
          style={{ top: toPx(r.from), height: toPx(r.to) - toPx(r.from), backgroundImage: HATCH }}
        />
      ))}

      {placed.map((p) => (
        <BookingBlock
          key={p.booking.id}
          placed={p}
          top={toPx(p.startMin)}
          height={(p.booking.totalDuration / 60) * HOUR_HEIGHT}
          onClick={() => onBookingClick(p.booking)}
        />
      ))}
    </div>
  );
}

function BookingBlock({
  placed,
  top,
  height,
  onClick,
}: {
  placed: Placed;
  top: number;
  height: number;
  onClick: () => void;
}) {
  const { booking, lane, lanes } = placed;
  const colors = STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;
  const sourceIcon = SOURCE_ICONS[booking.source] ?? null;
  const widthPct = 100 / lanes;
  const unpaid = booking.status === 'completed' && !booking.transactionId;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${booking.client.name} · ${TIME_FMT.format(new Date(booking.startTime))}–${TIME_FMT.format(new Date(booking.endTime))} · ${booking.services.map((s) => s.name).join(', ')}`}
      className="absolute z-[1] overflow-hidden rounded-md text-left shadow-sm transition-shadow hover:shadow-md"
      style={{
        top,
        left: `calc(${lane * widthPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
        height: Math.max(height - 2, 26),
        padding: '5px 8px',
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      <div className="flex items-start" style={{ gap: '4px' }}>
        {sourceIcon ? (
          <span className="shrink-0" style={{ marginTop: '2px', color: colors.text }}>
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
            className="truncate text-[10px] leading-tight"
            style={{ color: colors.text, opacity: 0.8 }}
          >
            {TIME_FMT.format(new Date(booking.startTime))} · {booking.totalDuration}min
            {unpaid ? ' · por cobrar' : ''}
          </p>
          {height > 50 ? (
            <p
              className="truncate text-[10px] leading-tight italic"
              style={{ marginTop: '4px', color: colors.text, opacity: 0.7 }}
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
  showStatus,
}: {
  booking: AdminBookingForList;
  onClick: () => void;
  showStatus?: boolean;
}) {
  const colors = STATUS_COLORS[booking.status] ?? FALLBACK_COLORS;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-md text-left transition-opacity hover:opacity-80"
      style={{
        gap: '12px',
        padding: '8px 12px',
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      <span className="font-mono text-xs font-semibold" style={{ color: colors.text }}>
        {TIME_FMT.format(new Date(booking.startTime))}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: colors.text }}>
        {booking.client.name} · {booking.services[0]?.name}
        {booking.staff ? ` · ${booking.staff.name}` : ''}
      </span>
      {showStatus ? (
        <span className="shrink-0 text-[11px]" style={{ color: colors.text }}>
          {colors.label}
        </span>
      ) : null}
    </button>
  );
}
