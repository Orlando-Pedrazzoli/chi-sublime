// 📄 src/components/admin/dashboard/TodayBoard.tsx
'use client';

/**
 * Chi Sublime — TodayBoard (dashboard · board de atendimento)
 * ============================================================
 *
 * O posto de trabalho do balcão. O salão tem UM computador aberto
 * na dashboard e todas as profissionais usam o mesmo ecrã, por isso
 * o board é organizado POR PROFISSIONAL (uma coluna cada), não por
 * estado: cada uma encontra a sua coluna num relance, mesmo com três
 * atendimentos a decorrer ao mesmo tempo.
 *
 * Dentro de cada coluna, sempre a mesma ordem:
 *   1. Em atendimento (destacado, com cronómetro)
 *   2. A seguir (por hora)
 *   3. Concluídas (colapsado; sinaliza "Por cobrar")
 *
 * Ações otimistas: o cartão muda de secção no instante do toque e
 * reverte com toast se a server action falhar. Depois de cada ação,
 * router.refresh() — o <DashboardAutoRefresh /> trata do resto.
 *
 * Reutiliza o que já existe: updateBookingStatusAction, CheckoutModal
 * (prefill), BookingDetailModal e NewBookingModal (walk-in).
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Users } from 'lucide-react';
import {
  updateBookingStatusAction,
  type AdminBookingForList,
  type AdminBookingMeta,
} from '@/lib/server-actions/admin-bookings';
import { CheckoutModal, type CheckoutPrefill } from '@/components/admin/checkout/CheckoutModal';
import { BookingDetailModal } from '@/components/admin/agenda/BookingDetailModal';
import { NewBookingModal } from '@/components/admin/agenda/NewBookingModal';
import { useToast } from '@/hooks/useToast';
import { BoardBookingCard, type BoardAction } from './BoardBookingCard';

type BookingStatus = AdminBookingForList['status'];
type StaffOption = AdminBookingMeta['staff'][number];

type TodayBoardProps = {
  bookings: AdminBookingForList[];
  staff: StaffOption[];
  services: AdminBookingMeta['services'];
  /** YYYY-MM-DD de hoje em Lisboa (para o walk-in) */
  today: string;
};

type Override = { status: BookingStatus; startedAt?: Date };

const UNASSIGNED = '__unassigned__';

export function TodayBoard({ bookings, staff, services, today }: TodayBoardProps) {
  const router = useRouter();
  const toast = useToast();

  // ── Relógio partilhado (cronómetros / "atrasada") ────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Estado otimista ──────────────────────────────────────────
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [busy, setBusy] = useState<Record<string, true>>({});

  // Quando o servidor devolve dados novos (router.refresh), os
  // overrides já cumpriram a sua função.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setOverrides({});
  }, [bookings]);

  const merged = useMemo(
    () =>
      bookings.map((b) => {
        const o = overrides[b.bookingNumber];
        return o ? { ...b, status: o.status, startedAt: o.startedAt ?? b.startedAt } : b;
      }),
    [bookings, overrides],
  );

  // ── Modais ───────────────────────────────────────────────────
  const [prefill, setPrefill] = useState<CheckoutPrefill | null>(null);
  const [detail, setDetail] = useState<AdminBookingForList | null>(null);
  const [walkInStaffId, setWalkInStaffId] = useState<string | null>(null);

  // ── Colunas por profissional ─────────────────────────────────
  const columns = useMemo(() => {
    const byStaff = new Map<string, AdminBookingForList[]>();
    for (const b of merged) {
      const key = b.staff?.id ?? UNASSIGNED;
      if (!byStaff.has(key)) byStaff.set(key, []);
      byStaff.get(key)!.push(b);
    }

    const list: Array<{ id: string; name: string; photo?: string; items: AdminBookingForList[] }> =
      staff.map((s) => ({ id: s.id, name: s.name, photo: s.photo, items: byStaff.get(s.id) ?? [] }));

    // Profissionais inativas que ainda têm reservas hoje
    for (const [key, items] of byStaff) {
      if (key === UNASSIGNED || staff.some((s) => s.id === key)) continue;
      list.push({ id: key, name: items[0].staff?.name ?? 'Profissional', items });
    }
    if (byStaff.has(UNASSIGNED)) {
      list.push({ id: UNASSIGNED, name: 'Sem profissional', items: byStaff.get(UNASSIGNED)! });
    }
    return list;
  }, [merged, staff]);

  const totals = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let toCharge = 0;
    for (const b of merged) {
      if (b.status === 'in-progress') live += 1;
      else if (b.status === 'pending' || b.status === 'confirmed') upcoming += 1;
      else if (b.status === 'completed' && !b.transactionId) toCharge += 1;
    }
    return { live, upcoming, toCharge };
  }, [merged]);

  // ── Ações ────────────────────────────────────────────────────
  async function changeStatus(booking: AdminBookingForList, newStatus: BookingStatus) {
    const key = booking.bookingNumber;
    setBusy((b) => ({ ...b, [key]: true }));
    setOverrides((o) => ({
      ...o,
      [key]: { status: newStatus, startedAt: newStatus === 'in-progress' ? new Date() : undefined },
    }));

    const result = await updateBookingStatusAction({ bookingNumber: key, newStatus });

    setBusy((b) => {
      const next = { ...b };
      delete next[key];
      return next;
    });

    if (result.success) {
      router.refresh();
    } else {
      setOverrides((o) => {
        const next = { ...o };
        delete next[key];
        return next;
      });
      toast.error(result.error);
    }
  }

  function handleAction(action: BoardAction, booking: AdminBookingForList) {
    switch (action) {
      case 'confirm':
        void changeStatus(booking, 'confirmed');
        break;
      case 'start':
        void changeStatus(booking, 'in-progress');
        break;
      case 'finish':
        void changeStatus(booking, 'completed');
        break;
      case 'no-show':
        if (window.confirm(`Marcar ${booking.client.name} como "não compareceu"?`)) {
          void changeStatus(booking, 'no-show');
        }
        break;
      case 'charge':
        setPrefill({
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          client: booking.client.id ? { id: booking.client.id, name: booking.client.name } : null,
          staffId: booking.staff?.id ?? null,
          services: booking.services
            .filter((s) => Boolean(s.serviceId))
            .map((s) => ({ serviceId: s.serviceId, name: s.name, price: s.price })),
        });
        break;
      case 'open':
        setDetail(booking);
        break;
    }
  }

  function walkInTime(): string {
    // Hora atual em Lisboa, arredondada aos próximos 5 min
    const parts = new Intl.DateTimeFormat('pt-PT', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 9);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    let total = h * 60 + Math.ceil(m / 5) * 5;
    if (total >= 24 * 60) total = 23 * 60 + 55;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <section className="mb-8">
      {/* Cabeçalho do board */}
      <div className="mb-3 flex flex-wrap items-center justify-between" style={{ gap: '8px' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <Users size={16} style={{ color: '#D4AF6E' }} />
          <h2 className="text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
            Atendimento de hoje
          </h2>
        </div>
        <p className="text-xs" style={{ color: '#5A5A5A' }}>
          <Stat n={totals.live} label="em atendimento" color="#1F3D2E" />
          <span style={{ margin: '0 6px' }}>·</span>
          <Stat n={totals.upcoming} label="por chegar" color="#B8924A" />
          {totals.toCharge > 0 ? (
            <>
              <span style={{ margin: '0 6px' }}>·</span>
              <Stat n={totals.toCharge} label="por cobrar" color="#B23C3C" />
            </>
          ) : null}
        </p>
      </div>

      {columns.length === 0 ? (
        <div
          className="rounded-lg border border-dashed text-center text-sm"
          style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#5A5A5A', padding: '32px 16px' }}
        >
          Sem profissionais ativas. Adicione a equipa em Definições → Equipa.
        </div>
      ) : (
        <div
          className="-mx-4 px-4 lg:mx-0 lg:px-0"
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: `minmax(min(85vw, 300px), 1fr)`,
            gap: '12px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: '8px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {columns.map((col) => (
            <StaffColumn
              key={col.id}
              id={col.id}
              name={col.name}
              photo={col.photo}
              items={col.items}
              now={now}
              busy={busy}
              onAction={handleAction}
              onWalkIn={
                col.id === UNASSIGNED
                  ? undefined
                  : () => setWalkInStaffId(staff.some((s) => s.id === col.id) ? col.id : '')
              }
            />
          ))}
        </div>
      )}

      {/* ── Modais ───────────────────────────────────────────── */}
      <CheckoutModal
        open={prefill !== null}
        prefill={prefill}
        onClose={() => setPrefill(null)}
        onCompleted={() => {
          setPrefill(null);
          toast.success('Venda registada — reserva concluída.');
          router.refresh();
        }}
      />

      {detail ? (
        <BookingDetailModal
          booking={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {
            setDetail(null);
            router.refresh();
          }}
        />
      ) : null}

      {walkInStaffId !== null ? (
        <NewBookingModal
          staff={staff}
          services={services}
          defaultDate={today}
          prefillTime={walkInTime()}
          prefillStaffId={walkInStaffId || undefined}
          prefillSource="walk-in"
          onClose={() => setWalkInStaffId(null)}
          onCreated={() => {
            setWalkInStaffId(null);
            toast.success('Walk-in registado.');
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

// ============================================================
// Coluna de uma profissional
// ============================================================

function StaffColumn({
  id,
  name,
  photo,
  items,
  now,
  busy,
  onAction,
  onWalkIn,
}: {
  id: string;
  name: string;
  photo?: string;
  items: AdminBookingForList[];
  now: number;
  busy: Record<string, true>;
  onAction: (action: BoardAction, booking: AdminBookingForList) => void;
  onWalkIn?: () => void;
}) {
  const [showDone, setShowDone] = useState(false);

  const live = items.filter((b) => b.status === 'in-progress');
  const upcoming = items
    .filter((b) => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const done = items
    .filter((b) => b.status === 'completed' || b.status === 'no-show')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const toCharge = done.filter((b) => b.status === 'completed' && !b.transactionId);

  const isUnassigned = id === UNASSIGNED;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="flex flex-col rounded-lg border"
      style={{
        backgroundColor: '#FAF7F2',
        borderColor: live.length > 0 ? 'rgba(31,61,46,0.35)' : 'rgba(31,61,46,0.08)',
        scrollSnapAlign: 'start',
        minHeight: '260px',
      }}
    >
      {/* Cabeçalho da coluna */}
      <div
        className="flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(31,61,46,0.08)', padding: '10px 12px', gap: '8px' }}
      >
        <div className="flex min-w-0 items-center" style={{ gap: '10px' }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
              style={{ border: '2px solid #D4AF6E' }}
            />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-xs"
              style={{ backgroundColor: '#1F3D2E', color: '#D4AF6E' }}
            >
              {isUnassigned ? '?' : initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: '#1F3D2E' }}>
              {name}
            </p>
            <p className="truncate text-[11px]" style={{ color: '#5A5A5A' }}>
              {live.length > 0 ? 'Em atendimento' : upcoming.length > 0 ? 'Livre' : 'Sem mais clientes'}
              {upcoming.length > 0 ? ` · ${upcoming.length} por chegar` : ''}
            </p>
          </div>
        </div>
        {onWalkIn ? (
          <button
            type="button"
            onClick={onWalkIn}
            title="Walk-in agora"
            className="inline-flex shrink-0 items-center justify-center rounded-md border text-xs font-semibold transition-colors hover:bg-white"
            style={{
              borderColor: 'rgba(31,61,46,0.2)',
              color: '#1F3D2E',
              minHeight: '36px',
              padding: '6px 10px',
              gap: '4px',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            Walk-in
          </button>
        ) : null}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col" style={{ padding: '10px', gap: '8px' }}>
        {live.map((b) => (
          <BoardBookingCard
            key={b.bookingNumber}
            booking={b}
            now={now}
            busy={Boolean(busy[b.bookingNumber])}
            showStaff={isUnassigned}
            onAction={onAction}
          />
        ))}

        {upcoming.length > 0 ? (
          <>
            {live.length > 0 ? <SectionLabel>A seguir</SectionLabel> : null}
            {upcoming.map((b) => (
              <BoardBookingCard
                key={b.bookingNumber}
                booking={b}
                now={now}
                busy={Boolean(busy[b.bookingNumber])}
                showStaff={isUnassigned}
                onAction={onAction}
              />
            ))}
          </>
        ) : live.length === 0 ? (
          <p
            className="rounded-md border border-dashed text-center text-xs italic"
            style={{ borderColor: 'rgba(31,61,46,0.15)', color: '#9A9A9A', padding: '20px 12px' }}
          >
            Sem reservas por atender.
          </p>
        ) : null}

        {/* Por cobrar fica sempre visível — é dinheiro */}
        {!showDone && toCharge.length > 0
          ? toCharge.map((b) => (
              <BoardBookingCard
                key={b.bookingNumber}
                booking={b}
                now={now}
                busy={Boolean(busy[b.bookingNumber])}
                showStaff={isUnassigned}
                onAction={onAction}
              />
            ))
          : null}

        {done.length > 0 ? (
          <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="flex w-full items-center justify-between text-[11px] tracking-[0.15em] uppercase"
              style={{ color: '#5A5A5A', padding: '6px 4px', minHeight: '36px' }}
            >
              <span>
                Concluídas ({done.length})
                {toCharge.length > 0 ? (
                  <span style={{ color: '#B23C3C' }}> · {toCharge.length} por cobrar</span>
                ) : null}
              </span>
              {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showDone ? (
              <div className="flex flex-col" style={{ gap: '8px', marginTop: '4px' }}>
                {done.map((b) => (
                  <BoardBookingCard
                    key={b.bookingNumber}
                    booking={b}
                    now={now}
                    busy={Boolean(busy[b.bookingNumber])}
                    showStaff={isUnassigned}
                    onAction={onAction}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] tracking-[0.2em] uppercase"
      style={{ color: '#9A9A9A', padding: '4px 2px 0' }}
    >
      {children}
    </p>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span>
      <strong className="font-mono" style={{ color }}>
        {n}
      </strong>{' '}
      {label}
    </span>
  );
}
