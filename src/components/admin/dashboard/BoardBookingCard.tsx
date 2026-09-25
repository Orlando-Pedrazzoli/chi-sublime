// 📄 src/components/admin/dashboard/BoardBookingCard.tsx
'use client';

/**
 * Chi Sublime — BoardBookingCard (dashboard · board de atendimento)
 * ============================================================
 *
 * Um cartão = uma reserva de hoje, com UM botão principal que é
 * sempre a próxima ação do ciclo de atendimento:
 *
 *   pending/confirmed  →  [Iniciar]            (1 toque, sem modal)
 *   in-progress        →  [Terminar & Cobrar]  (abre o POS pré-preenchido)
 *   completed s/ venda →  [Cobrar]             (nunca perder receita)
 *   completed c/ venda →  "Cobrada"
 *
 * Tocar no nome da cliente abre o BookingDetailModal (notas, telefone,
 * cancelar) — o cartão é o atalho, o modal continua a ser o detalhe.
 *
 * ⚠️ Tailwind v4 + Next 16 descarta padding/cores em produção —
 * tudo o que é visualmente crítico vai em inline style.
 */

import { AlertCircle, CheckCircle2, Euro, PlayCircle, Receipt } from 'lucide-react';
import type { AdminBookingForList } from '@/lib/server-actions/admin-bookings';

type BookingStatus = AdminBookingForList['status'];

export type BoardAction = 'confirm' | 'start' | 'finish' | 'no-show' | 'charge' | 'open';

type BoardBookingCardProps = {
  booking: AdminBookingForList;
  /** Instante "agora" partilhado pelo board (tick de 30s) para os cronómetros */
  now: number;
  /** true enquanto uma ação desta reserva está a ser gravada */
  busy: boolean;
  /** Mostrar o nome da profissional (só na coluna "Sem profissional") */
  showStaff?: boolean;
  onAction: (action: BoardAction, booking: AdminBookingForList) => void;
};

const TIME_FMT = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  hour: '2-digit',
  minute: '2-digit',
});

const BTN: React.CSSProperties = {
  padding: '10px 14px',
  gap: '8px',
  minHeight: '48px',
};

export function BoardBookingCard({
  booking,
  now,
  busy,
  showStaff = false,
  onAction,
}: BoardBookingCardProps) {
  const status: BookingStatus = booking.status;
  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  const isCharged = Boolean(booking.transactionId);
  const isLive = status === 'in-progress';
  const isDone = status === 'completed' || status === 'no-show';
  const services = booking.services.map((s) => s.name).join(' · ');

  // Atrasada: hora marcada já passou há mais de 10 min e ainda não começou
  const isLate = !isLive && !isDone && now - start > 10 * 60 * 1000;

  // Cronómetro (em curso): desde o início real, ou desde a hora marcada
  const startedAt = booking.startedAt ? new Date(booking.startedAt).getTime() : start;
  const elapsedMin = Math.max(0, Math.round((now - startedAt) / 60000));
  const overdue = isLive && now > end;

  const accent = isLive ? '#1F3D2E' : isLate ? '#C4861E' : isDone ? '#9A9A9A' : '#D4AF6E';

  return (
    <article
      className="rounded-lg border transition-shadow"
      style={{
        backgroundColor: isLive ? '#1F3D2E' : '#FFFFFF',
        borderColor: isLive ? '#1F3D2E' : isLate ? 'rgba(196,134,30,0.5)' : 'rgba(31,61,46,0.1)',
        borderLeftWidth: '4px',
        borderLeftColor: accent,
        padding: '12px 14px',
        opacity: isDone && !(!isCharged && status === 'completed') ? 0.7 : 1,
      }}
    >
      {/* Cabeçalho: hora + estado */}
      <div className="flex items-center justify-between" style={{ gap: '8px' }}>
        <span
          className="font-mono text-sm font-semibold"
          style={{ color: isLive ? '#D4AF6E' : '#1F3D2E' }}
        >
          {TIME_FMT.format(new Date(booking.startTime))}
          <span
            className="font-normal"
            style={{ color: isLive ? 'rgba(250,247,242,0.6)' : '#9A9A9A' }}
          >
            {' '}
            – {TIME_FMT.format(new Date(booking.endTime))}
          </span>
        </span>

        {isLive ? (
          <span
            className="rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{
              backgroundColor: overdue ? '#C4861E' : 'rgba(212,175,110,0.2)',
              color: overdue ? '#1F3D2E' : '#D4AF6E',
              padding: '3px 8px',
            }}
          >
            {overdue ? `+${Math.round((now - end) / 60000)} min` : `há ${elapsedMin} min`}
          </span>
        ) : isLate ? (
          <span
            className="rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{ backgroundColor: 'rgba(196,134,30,0.15)', color: '#C4861E', padding: '3px 8px' }}
          >
            Atrasada
          </span>
        ) : status === 'pending' ? (
          <span
            className="rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{ backgroundColor: 'rgba(212,175,110,0.15)', color: '#B8924A', padding: '3px 8px' }}
          >
            Por confirmar
          </span>
        ) : status === 'no-show' ? (
          <span
            className="rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{ backgroundColor: 'rgba(90,90,90,0.1)', color: '#5A5A5A', padding: '3px 8px' }}
          >
            Faltou
          </span>
        ) : status === 'completed' && isCharged ? (
          <span
            className="inline-flex items-center rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{
              backgroundColor: 'rgba(92,138,47,0.12)',
              color: '#5C8A2F',
              padding: '3px 8px',
              gap: '4px',
            }}
          >
            <Receipt size={11} strokeWidth={1.5} /> Cobrada
          </span>
        ) : status === 'completed' ? (
          <span
            className="rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase"
            style={{ backgroundColor: 'rgba(178,60,60,0.1)', color: '#B23C3C', padding: '3px 8px' }}
          >
            Por cobrar
          </span>
        ) : null}
      </div>

      {/* Cliente + serviços (toque → detalhe) */}
      <button
        type="button"
        onClick={() => onAction('open', booking)}
        className="block w-full text-left"
        style={{ marginTop: '6px' }}
      >
        <p
          className="truncate font-serif text-lg leading-tight"
          style={{ color: isLive ? '#FAF7F2' : '#1A1A1A' }}
        >
          {booking.client.name}
        </p>
        <p
          className="truncate text-xs"
          style={{ color: isLive ? 'rgba(250,247,242,0.7)' : '#5A5A5A', marginTop: '2px' }}
        >
          {services}
          {showStaff && booking.staff ? ` · ${booking.staff.name}` : ''}
        </p>
      </button>

      {/* Ação principal */}
      {isLive ? (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction('charge', booking)}
            className="inline-flex w-full items-center justify-center rounded-md text-sm font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
            style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E', ...BTN }}
          >
            <Euro size={16} strokeWidth={1.5} />
            Terminar & Cobrar {(booking.totalPrice / 100).toFixed(2)} €
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction('finish', booking)}
            className="block w-full text-center text-[11px] underline-offset-2 hover:underline disabled:opacity-50"
            style={{ color: 'rgba(250,247,242,0.6)', marginTop: '6px', padding: '4px' }}
          >
            Terminar sem cobrar
          </button>
        </div>
      ) : status === 'pending' || status === 'confirmed' ? (
        <div className="flex" style={{ marginTop: '10px', gap: '8px' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction('start', booking)}
            className="inline-flex flex-1 items-center justify-center rounded-md text-sm font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
            style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2', ...BTN }}
          >
            <PlayCircle size={16} strokeWidth={1.5} />
            Iniciar
          </button>
          {status === 'pending' ? (
            <button
              type="button"
              disabled={busy}
              title="Confirmar reserva (envia email à cliente)"
              onClick={() => onAction('confirm', booking)}
              className="inline-flex items-center justify-center rounded-md border transition-colors hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: 'rgba(92,138,47,0.4)', color: '#5C8A2F', ...BTN, padding: '10px 12px' }}
            >
              <CheckCircle2 size={16} strokeWidth={1.5} />
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            title="Não compareceu"
            onClick={() => onAction('no-show', booking)}
            className="inline-flex items-center justify-center rounded-md border transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#5A5A5A', ...BTN, padding: '10px 12px' }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
          </button>
        </div>
      ) : status === 'completed' && !isCharged ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction('charge', booking)}
          className="inline-flex w-full items-center justify-center rounded-md border text-sm font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
          style={{
            borderColor: '#D4AF6E',
            color: '#1F3D2E',
            backgroundColor: 'rgba(212,175,110,0.1)',
            marginTop: '10px',
            ...BTN,
          }}
        >
          <Euro size={16} strokeWidth={1.5} />
          Cobrar {(booking.totalPrice / 100).toFixed(2)} €
        </button>
      ) : null}
    </article>
  );
}
