// 📄 src/components/admin/agenda/BookingDetailModal.tsx
'use client';

/**
 * Chi Sublime — BookingDetailModal (agenda admin)
 * ============================================================
 *
 * Detalhe de uma marcação com as ações de estado e, a partir de
 * agora, a COBRANÇA: o botão "Cobrar" abre o POS (CheckoutModal)
 * já preenchido com os serviços, cliente e profissional da marcação.
 * A venda fica ligada à marcação (Booking.transactionId) e a marcação
 * passa a "Concluída" — é assim que a receita chega ao dashboard.
 *
 * REVISÃO (nov. 2026):
 *  - NOVO "Remarcar": muda o dia, a hora e/ou o profissional sem
 *    cancelar. Mostra os horários realmente livres (o mesmo motor do
 *    site, ignorando a própria marcação); "Forçar encaixe" permite uma
 *    hora fora da grelha. A cliente recebe um email com a nova data.
 *    Antes era preciso cancelar (email de cancelamento à cliente) e
 *    criar outra marcação.
 *  - FIX: uma marcação "Não compareceu" mostrava o botão "Cancelar
 *    marcação", que falhava sempre (a transição não é permitida).
 */

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  PlayCircle,
  Trash2,
  AlertCircle,
  Euro,
  Receipt,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import {
  getRescheduleSlotsAction,
  rescheduleBookingAction,
  updateBookingStatusAction,
  type AdminBookingForList,
} from '@/lib/server-actions/admin-bookings';
import { salonDayISO } from '@/lib/utils/salon-day';
import { CheckoutModal, type CheckoutPrefill } from '@/components/admin/checkout/CheckoutModal';
import { SALON_TIMEZONE } from '@/lib/constants/business';

type BookingStatus = AdminBookingForList['status'];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: 'rgba(212,175,110,0.15)', color: '#B8924A' },
  confirmed: { label: 'Confirmada', bg: 'rgba(151,196,89,0.15)', color: '#5C8A2F' },
  'in-progress': { label: 'Em curso', bg: 'rgba(45,84,64,0.15)', color: '#1F3D2E' },
  completed: { label: 'Concluída', bg: 'rgba(31,61,46,0.1)', color: '#1F3D2E' },
  cancelled: { label: 'Cancelada', bg: 'rgba(178,60,60,0.1)', color: '#B23C3C' },
  'no-show': { label: 'Não compareceu', bg: 'rgba(90,90,90,0.1)', color: '#5A5A5A' },
};

/**
 * ⚠️ Tailwind v4 + Next 16 descarta `px-*`/`py-*`/`gap-*` em produção
 * (texto colado às bordas dos botões). Padding/gap dos botões de acção
 * vão em INLINE STYLE, como no resto do admin.
 */
const ACTION_BTN: React.CSSProperties = {
  padding: '12px 18px',
  gap: '8px',
  minHeight: '44px',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site',
  phone: 'Telefone',
  'walk-in': 'Walk-in',
  instagram: 'Instagram',
  admin: 'Admin',
};

type BookingDetailModalProps = {
  booking: AdminBookingForList;
  /** Equipa ativa — permite trocar de profissional ao remarcar */
  staff?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onChanged: () => void;
};

type SlotsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; times: string[]; closedDetail?: string }
  | { status: 'error'; message: string };

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(31,61,46,0.2)',
  backgroundColor: '#FFFFFF',
  color: '#1A1A1A',
  fontSize: '14px',
  minHeight: '44px',
};

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#5A5A5A',
};

export function BookingDetailModal({
  booking,
  staff,
  onClose,
  onChanged,
}: BookingDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // ── Remarcar ───────────────────────────────────────────────
  const canReschedule = booking.status === 'pending' || booking.status === 'confirmed';
  const currentDay = salonDayISO(booking.startTime);
  const today = salonDayISO();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  // Uma marcação de um dia já passado remarca-se, por defeito, para hoje
  const [newDate, setNewDate] = useState(currentDay < today ? today : currentDay);
  const [newStaffId, setNewStaffId] = useState(booking.staff?.id ?? '');
  const [newTime, setNewTime] = useState('');
  const [force, setForce] = useState(false);
  const [slots, setSlots] = useState<SlotsState>({ status: 'idle' });
  const slotsRequestRef = useRef(0);

  // A equipa ativa + o profissional atual (pode já estar inativo)
  const staffOptions = useMemo(() => {
    const options = [...(staff ?? [])];
    if (booking.staff && !options.some((s) => s.id === booking.staff?.id)) {
      options.unshift({ id: booking.staff.id, name: booking.staff.name });
    }
    return options;
  }, [staff, booking.staff]);

  useEffect(() => {
    if (!rescheduleOpen || force || !newDate || !newStaffId) return;
    const requestId = ++slotsRequestRef.current;
    let cancelled = false;

    (async () => {
      setSlots({ status: 'loading' });
      try {
        const result = await getRescheduleSlotsAction({
          bookingNumber: booking.bookingNumber,
          date: newDate,
          staffId: newStaffId,
        });
        if (cancelled || requestId !== slotsRequestRef.current) return;
        setSlots(
          result.success
            ? { status: 'loaded', times: result.times, closedDetail: result.closedDetail }
            : { status: 'error', message: result.error },
        );
      } catch {
        if (cancelled || requestId !== slotsRequestRef.current) return;
        setSlots({ status: 'error', message: 'Não foi possível carregar os horários.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rescheduleOpen, force, newDate, newStaffId, booking.bookingNumber]);

  const currentTime = new Intl.DateTimeFormat('pt-PT', {
    timeZone: SALON_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(booking.startTime));
  const sameAsCurrent =
    newDate === currentDay && newStaffId === (booking.staff?.id ?? '') && newTime === currentTime;
  const canSubmitReschedule = Boolean(newDate && newStaffId && newTime) && !sameAsCurrent;

  function openReschedule() {
    setError(null);
    setConfirmCancel(false);
    setRescheduleOpen(true);
  }

  function handleReschedule() {
    if (!canSubmitReschedule) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBookingAction({
        bookingNumber: booking.bookingNumber,
        date: newDate,
        time: newTime,
        staffId: newStaffId,
        force,
      });
      if (result.success) {
        onChanged();
      } else {
        setError(result.error);
      }
    });
  }

  // A marcação pode ser cobrada quando está viva e ainda não tem venda.
  const isCharged = Boolean(booking.transactionId);
  const canCharge = !isCharged && booking.status !== 'cancelled' && booking.status !== 'no-show';

  const prefill = useMemo<CheckoutPrefill>(
    () => ({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      client: booking.client.id ? { id: booking.client.id, name: booking.client.name } : null,
      staffId: booking.staff?.id ?? null,
      services: booking.services
        .filter((s) => Boolean(s.serviceId))
        .map((s) => ({ serviceId: s.serviceId, name: s.name, price: s.price })),
    }),
    [booking],
  );

  // Data/hora SEMPRE em hora de Lisboa (não no fuso do dispositivo)
  const dateFmt = new Intl.DateTimeFormat('pt-PT', {
    timeZone: SALON_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    timeZone: SALON_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  function handleStatusChange(newStatus: BookingStatus, reason?: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingStatusAction({
        bookingNumber: booking.bookingNumber,
        newStatus,
        reason,
      });
      if (result.success) {
        onChanged();
      } else {
        setError(result.error);
      }
    });
  }

  const sourceLabel = SOURCE_LABELS[booking.source] ?? booking.source;
  const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.pending;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        style={{ backgroundColor: 'rgba(20,40,32,0.6)' }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-lg"
          style={{
            backgroundColor: '#FFFFFF',
            // dvh: em iOS, 90vh ficava por baixo da barra do browser
            maxHeight: '92dvh',
            // Os botões do fundo não ficam por baixo da barra do gesto "home"
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            overscrollBehavior: 'contain',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sticky top-0 flex items-start justify-between gap-3 p-5"
            style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
          >
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#D4AF6E' }}>
                {sourceLabel} · {booking.bookingNumber}
              </p>
              <h2 className="mt-1 font-serif text-2xl">{booking.client.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 rounded-md p-2 transition-colors hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <div
              className="rounded-md px-3 py-2 text-center text-xs font-semibold tracking-[0.22em] uppercase"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {badge.label}
            </div>

            <div>
              <p
                className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                <Calendar size={14} style={{ color: '#D4AF6E' }} />
                Data e hora
              </p>
              <p className="font-serif text-lg capitalize" style={{ color: '#1A1A1A' }}>
                {dateFmt.format(new Date(booking.startTime))}
              </p>
              <p className="text-sm" style={{ color: '#5A5A5A' }}>
                <Clock size={12} className="mr-1 inline" />
                {timeFmt.format(new Date(booking.startTime))} —{' '}
                {timeFmt.format(new Date(booking.endTime))} · {booking.totalDuration} min
              </p>
            </div>

            {booking.staff && (
              <div>
                <p
                  className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#5A5A5A' }}
                >
                  <UserIcon size={14} style={{ color: '#D4AF6E' }} />
                  Profissional
                </p>
                <p className="text-base" style={{ color: '#1A1A1A' }}>
                  {booking.staff.name}
                </p>
              </div>
            )}

            <div>
              <p
                className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                <UserIcon size={14} style={{ color: '#D4AF6E' }} />
                Cliente
              </p>
              <p className="text-base" style={{ color: '#1A1A1A' }}>
                {booking.client.name}
              </p>
              <div className="mt-1 space-y-1 text-sm" style={{ color: '#5A5A5A' }}>
                {booking.client.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    <span>{booking.client.phone}</span>
                  </div>
                ) : null}
                {booking.client.email ? (
                  <div className="flex items-center gap-2">
                    <Mail size={12} />
                    <span>{booking.client.email}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <p
                className="mb-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                Serviços
              </p>
              <ul className="space-y-1.5">
                {booking.services.map((s, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-sm"
                    style={{ color: '#1A1A1A' }}
                  >
                    <span>{s.name}</span>
                    <span className="font-mono text-xs" style={{ color: '#5A5A5A' }}>
                      {s.duration}min · {(s.price / 100).toFixed(2)} €
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className="mt-3 flex items-center justify-between border-t pt-3"
                style={{ borderColor: 'rgba(31,61,46,0.08)' }}
              >
                <span className="text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
                  Total
                </span>
                <span className="font-mono text-lg font-semibold" style={{ color: '#1F3D2E' }}>
                  {(booking.totalPrice / 100).toFixed(2)} €
                </span>
              </div>
            </div>

            {booking.notes ? (
              <div>
                <p
                  className="mb-2 text-[10px] tracking-[0.22em] uppercase"
                  style={{ color: '#5A5A5A' }}
                >
                  Notas
                </p>
                <p className="text-sm italic" style={{ color: '#5A5A5A' }}>
                  {booking.notes}
                </p>
              </div>
            ) : null}

            {error ? (
              <div
                className="rounded-md border px-4 py-3 text-sm"
                style={{
                  borderColor: 'rgba(178,60,60,0.3)',
                  backgroundColor: 'rgba(178,60,60,0.08)',
                  color: '#B23C3C',
                }}
              >
                {error}
              </div>
            ) : null}

            {confirmCancel ? (
              <div
                className="rounded-md border p-4"
                style={{
                  borderColor: 'rgba(178,60,60,0.3)',
                  backgroundColor: 'rgba(178,60,60,0.05)',
                }}
              >
                <p className="mb-2 text-sm font-medium" style={{ color: '#B23C3C' }}>
                  Cancelar esta marcação?
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Razão do cancelamento (obrigatório)"
                  rows={2}
                  className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('cancelled', cancelReason || 'Sem razão')}
                    disabled={isPending || !cancelReason.trim()}
                    className="rounded-md text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#B23C3C', color: '#FAF7F2', padding: '10px 16px' }}
                  >
                    Confirmar cancelamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    disabled={isPending}
                    className="rounded-md border text-xs tracking-wide hover:bg-white"
                    style={{
                      borderColor: 'rgba(31,61,46,0.2)',
                      color: '#1A1A1A',
                      padding: '10px 16px',
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : null}

            {/* ── Remarcar ─────────────────────────────────────── */}
            {rescheduleOpen ? (
              <div
                className="rounded-md border"
                style={{
                  padding: '16px',
                  borderColor: 'rgba(212,175,110,0.5)',
                  backgroundColor: 'rgba(212,175,110,0.07)',
                }}
              >
                <p
                  className="flex items-center text-sm font-semibold"
                  style={{ gap: '8px', marginBottom: '14px', color: '#1F3D2E' }}
                >
                  <CalendarClock size={16} strokeWidth={1.5} />
                  Remarcar
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '12px' }}>
                  <label>
                    <span style={FIELD_LABEL}>Novo dia</span>
                    <input
                      type="date"
                      value={newDate}
                      min={today}
                      onChange={(e) => {
                        setNewDate(e.target.value);
                        if (!force) setNewTime('');
                      }}
                      style={FIELD}
                    />
                  </label>
                  <label>
                    <span style={FIELD_LABEL}>Profissional</span>
                    <select
                      value={newStaffId}
                      onChange={(e) => {
                        setNewStaffId(e.target.value);
                        if (!force) setNewTime('');
                      }}
                      style={FIELD}
                    >
                      {staffOptions.length === 0 ? <option value="">—</option> : null}
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <span style={FIELD_LABEL}>{force ? 'Hora (livre)' : 'Horários livres'}</span>

                  {force ? (
                    <input
                      type="time"
                      step={300}
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      style={{ ...FIELD, maxWidth: '160px' }}
                    />
                  ) : slots.status === 'loading' || slots.status === 'idle' ? (
                    <p
                      className="flex items-center text-sm"
                      style={{ gap: '8px', color: '#5A5A5A' }}
                    >
                      <Loader2 size={14} className="animate-spin" />A procurar horários…
                    </p>
                  ) : slots.status === 'error' ? (
                    <p className="text-sm" style={{ color: '#B23C3C' }}>
                      {slots.message}
                    </p>
                  ) : slots.times.length === 0 ? (
                    <p className="text-sm" style={{ color: '#7A5A2A' }}>
                      {slots.closedDetail
                        ? `Salão encerrado neste dia (${slots.closedDetail}).`
                        : 'Sem horários livres para este profissional neste dia.'}{' '}
                      Escolhe outro dia ou profissional, ou usa «Forçar encaixe».
                    </p>
                  ) : (
                    <div className="flex flex-wrap" style={{ gap: '8px' }}>
                      {slots.times.map((t) => {
                        const selected = t === newTime;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setNewTime(t)}
                            aria-pressed={selected}
                            className="font-mono text-sm transition-colors"
                            style={{
                              padding: '9px 12px',
                              minWidth: '64px',
                              borderRadius: '6px',
                              border: `1px solid ${selected ? '#1F3D2E' : 'rgba(31,61,46,0.2)'}`,
                              backgroundColor: selected ? '#1F3D2E' : '#FFFFFF',
                              color: selected ? '#FAF7F2' : '#1F3D2E',
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <label
                  className="flex items-start text-sm"
                  style={{ gap: '10px', marginTop: '14px', color: '#5A4A2A', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => {
                      setForce(e.target.checked);
                      setNewTime('');
                    }}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    Forçar encaixe — hora fora do horário normal ou da grelha de 30 min. Nunca
                    sobrepõe outra marcação.
                  </span>
                </label>

                {booking.client.email && booking.status === 'confirmed' ? (
                  <p className="text-xs" style={{ marginTop: '12px', color: '#5A5A5A' }}>
                    A cliente recebe um email com a nova data ({booking.client.email}).
                  </p>
                ) : null}

                <div className="flex flex-wrap" style={{ gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleReschedule}
                    disabled={isPending || !canSubmitReschedule}
                    className="inline-flex items-center justify-center rounded-md text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: '#1F3D2E',
                      color: '#FAF7F2',
                      fontSize: '12px',
                      ...ACTION_BTN,
                    }}
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CalendarClock size={14} strokeWidth={1.5} />
                    )}
                    {isPending
                      ? 'A remarcar…'
                      : newTime
                        ? `Remarcar para as ${newTime}`
                        : 'Remarcar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRescheduleOpen(false)}
                    disabled={isPending}
                    className="rounded-md border text-xs tracking-wide"
                    style={{
                      borderColor: 'rgba(31,61,46,0.2)',
                      color: '#1A1A1A',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12px',
                      ...ACTION_BTN,
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            ) : null}

            {/* ── Cobrança ─────────────────────────────────────── */}
            {isCharged ? (
              <div
                className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm"
                style={{
                  borderColor: 'rgba(92,138,47,0.3)',
                  backgroundColor: 'rgba(92,138,47,0.08)',
                  color: '#5C8A2F',
                }}
              >
                <Receipt size={16} strokeWidth={1.5} />
                <span>Cobrada — venda registada em Receitas.</span>
              </div>
            ) : null}

            {!confirmCancel && !rescheduleOpen && canCharge ? (
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-md text-sm font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                style={{
                  backgroundColor: '#D4AF6E',
                  color: '#1F3D2E',
                  ...ACTION_BTN,
                  minHeight: '48px',
                }}
              >
                <Euro size={16} strokeWidth={1.5} />
                Cobrar {(booking.totalPrice / 100).toFixed(2)} €
              </button>
            ) : null}

            {!confirmCancel &&
            !rescheduleOpen &&
            booking.status !== 'cancelled' &&
            booking.status !== 'completed' &&
            booking.status !== 'no-show' ? (
              <div
                className="grid grid-cols-2 border-t"
                style={{ borderColor: 'rgba(31,61,46,0.08)', gap: '10px', paddingTop: '16px' }}
              >
                {booking.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('confirmed')}
                    disabled={isPending}
                    className="col-span-2 inline-flex items-center justify-center rounded-md text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                    style={{ backgroundColor: '#5C8A2F', color: '#FAF7F2', ...ACTION_BTN }}
                  >
                    <CheckCircle2 size={14} strokeWidth={1.5} />
                    Confirmar marcação
                  </button>
                ) : null}

                {booking.status === 'pending' || booking.status === 'confirmed' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('in-progress')}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-md text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                    style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2', ...ACTION_BTN }}
                  >
                    <PlayCircle size={14} strokeWidth={1.5} />
                    Iniciar
                  </button>
                ) : null}

                {booking.status === 'in-progress' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('completed')}
                    disabled={isPending}
                    className="col-span-2 inline-flex items-center justify-center rounded-md text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                    style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2', ...ACTION_BTN }}
                  >
                    <CheckCircle2 size={14} strokeWidth={1.5} />
                    Concluir serviço
                  </button>
                ) : null}

                {booking.status === 'pending' || booking.status === 'confirmed' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange('no-show')}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-md border text-xs tracking-wide transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#5A5A5A', ...ACTION_BTN }}
                  >
                    <AlertCircle size={14} strokeWidth={1.5} />
                    Não compareceu
                  </button>
                ) : null}

                {canReschedule ? (
                  <button
                    type="button"
                    onClick={openReschedule}
                    disabled={isPending}
                    className="col-span-2 inline-flex items-center justify-center rounded-md border text-xs font-semibold tracking-wide transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: 'rgba(31,61,46,0.25)', color: '#1F3D2E', ...ACTION_BTN }}
                  >
                    <CalendarClock size={14} strokeWidth={1.5} />
                    Remarcar (dia, hora ou profissional)
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={isPending}
                  className="col-span-2 inline-flex items-center justify-center rounded-md border text-xs tracking-wide transition-colors hover:bg-red-50 disabled:opacity-50"
                  style={{ borderColor: 'rgba(178,60,60,0.3)', color: '#B23C3C', ...ACTION_BTN }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Cancelar marcação
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        prefill={prefill}
        onClose={() => setCheckoutOpen(false)}
        onCompleted={() => {
          setCheckoutOpen(false);
          onChanged();
        }}
      />
    </>
  );
}
