// 📄 src/components/client-area/BookingSuccessModal.tsx
'use client';

/**
 * Chi Sublime — Modal de sucesso da marcação (área de cliente)
 * ============================================================
 *
 * Abre quando o cliente chega a /conta/reservas?nova=CHI-2026-XXXX
 * logo após confirmar uma marcação no funil /marcacoes.
 *
 *  - "Obrigada, <nome>" + resumo curto (quando / com quem / total)
 *  - Aviso de que a confirmação foi enviada para o email
 *  - Adicionar ao calendário (Google / .ics) — só se já confirmada
 *  - Ao fechar: limpa o ?nova da URL e faz scroll até ao cartão
 *    da nova reserva (que fica destacado a dourado em MyBookings)
 *
 * ⚠️ Tailwind v4 + Next 16: paddings/cores críticas em INLINE STYLE.
 */

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { CalendarPlus, Mail, X } from 'lucide-react';
import { buildIcs, googleCalendarUrl } from '@/lib/booking/calendar-links';
import type { BookingForClient } from '@/lib/server-actions/bookings';

const TZ = 'Europe/Lisbon';

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const timeFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Props = {
  booking: BookingForClient;
  clientFirstName: string;
  clientEmail: string;
  onClose: () => void;
};

export function BookingSuccessModal({ booking, clientFirstName, clientEmail, onClose }: Props) {
  const router = useRouter();

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const pending = booking.status === 'pending';

  const calendarEvent = {
    bookingNumber: booking.bookingNumber,
    start,
    end,
    services: booking.services.map((s) => s.name).join(', '),
    staffName: booking.staff?.name ?? 'Chi Sublime',
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/conta/reservas`,
  };

  const handleClose = useCallback(() => {
    // Remove o ?nova= sem recarregar — um refresh/back não reabre o modal
    router.replace('/conta/reservas', { scroll: false });
    onClose();
  }, [router, onClose]);

  const downloadIcs = useCallback(() => {
    const blob = new Blob([buildIcs(calendarEvent)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chi-sublime-${booking.bookingNumber}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // calendarEvent deriva de props estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.bookingNumber]);

  // Escape + bloqueio de scroll do body
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [handleClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(20, 40, 32, 0.5)' }}
        onClick={handleClose}
        aria-hidden
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-success-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden"
        style={{
          backgroundColor: '#FAF7F2',
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(31, 61, 46, 0.25)',
        }}
      >
        {/* Faixa verde topo */}
        <div
          className="relative flex flex-col items-center text-center"
          style={{ backgroundColor: pending ? '#B8924A' : '#1F3D2E', padding: '32px 24px 28px' }}
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="absolute transition-opacity hover:opacity-70"
            style={{ top: '14px', right: '14px', padding: '6px', color: '#FAF7F2' }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>

          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '64px',
              height: '64px',
              marginBottom: '16px',
              backgroundColor: 'rgba(250,247,242,0.12)',
              border: '1px solid rgba(212,175,110,0.6)',
            }}
          >
            {pending ? (
              <svg
                width="30"
                height="30"
                viewBox="0 0 36 36"
                fill="none"
                stroke="#FAF7F2"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="18" cy="18" r="11" />
                <polyline points="18 11 18 18 23 21" />
              </svg>
            ) : (
              <svg
                width="30"
                height="30"
                viewBox="0 0 36 36"
                fill="none"
                stroke="#D4AF6E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="8 19 14 25 28 11" />
              </svg>
            )}
          </div>

          <span
            className="font-serif text-[11px] tracking-[0.3em] uppercase italic"
            style={{ color: '#D4AF6E', marginBottom: '10px' }}
          >
            {pending ? '— Pedido recebido —' : '— Marcação confirmada —'}
          </span>
          <h2
            id="booking-success-title"
            className="font-serif text-3xl leading-tight font-light"
            style={{ color: '#FAF7F2' }}
          >
            Obrigada, <span className="italic">{clientFirstName}</span>.
          </h2>
          <p
            className="font-mono text-xs tracking-wide"
            style={{ color: 'rgba(250,247,242,0.7)', marginTop: '10px' }}
          >
            {booking.bookingNumber}
          </p>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 24px 28px' }}>
          {/* Resumo curto */}
          <div
            className="rounded-lg border"
            style={{
              borderColor: 'rgba(212,175,110,0.35)',
              backgroundColor: '#FFFFFF',
              padding: '16px 18px',
              marginBottom: '16px',
            }}
          >
            <p className="font-serif text-lg leading-snug" style={{ color: '#1A1A1A' }}>
              {capitalize(dateFmt.format(start))}
            </p>
            <p className="font-mono text-sm" style={{ color: '#1F3D2E', marginTop: '4px' }}>
              {timeFmt.format(start)} – {timeFmt.format(end)}
              {booking.staff ? ` · com ${booking.staff.name}` : ''}
            </p>
            <p className="text-sm" style={{ color: '#5A5A5A', marginTop: '8px' }}>
              {booking.services.map((s) => s.name).join(', ')}
            </p>
          </div>

          {/* Email */}
          <div
            className="flex items-start gap-3 rounded-md"
            style={{
              backgroundColor: 'rgba(212,175,110,0.10)',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <Mail
              size={18}
              strokeWidth={1.5}
              style={{ color: '#B8924A', flexShrink: 0, marginTop: '2px' }}
            />
            <div className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
              {pending ? (
                <>
                  Guardámos este horário para si. Vai receber um email em{' '}
                  <strong>{clientEmail}</strong> assim que o salão confirmar.
                </>
              ) : (
                <>
                  Enviámos a confirmação para <strong>{clientEmail}</strong>. Verifique a sua caixa
                  de entrada (e o spam, por precaução).
                </>
              )}
            </div>
          </div>

          {/* Calendário — só quando confirmada */}
          {!pending && (
            <div className="flex flex-col gap-2 sm:flex-row" style={{ marginBottom: '20px' }}>
              <a
                href={googleCalendarUrl(calendarEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border text-xs font-medium tracking-[0.14em] uppercase transition-colors hover:bg-white"
                style={{
                  padding: '12px 16px',
                  borderColor: 'rgba(31,61,46,0.2)',
                  color: '#1F3D2E',
                }}
              >
                <CalendarPlus size={14} strokeWidth={1.5} />
                Google Calendar
              </a>
              <button
                type="button"
                onClick={downloadIcs}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border text-xs font-medium tracking-[0.14em] uppercase transition-colors hover:bg-white"
                style={{
                  padding: '12px 16px',
                  borderColor: 'rgba(31,61,46,0.2)',
                  color: '#1F3D2E',
                }}
              >
                <CalendarPlus size={14} strokeWidth={1.5} />
                Apple / Outlook
              </button>
            </div>
          )}

          {/* CTA principal */}
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex w-full items-center justify-center rounded-md text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
            style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2', padding: '16px 24px' }}
          >
            Ver as minhas marcações
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
