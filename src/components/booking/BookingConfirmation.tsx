// 📄 src/components/booking/BookingConfirmation.tsx
'use client';

/**
 * Chi Sublime — Booking Confirmation
 * ============================================================
 *
 * Página de sucesso da reserva.
 *
 *  - status 'confirmed' → "Reserva confirmada" + adicionar ao calendário
 *    (Google Calendar e ficheiro .ics para Apple/Outlook).
 *  - status 'pending'   → "Pedido recebido" (só com aprovação manual).
 *
 * FIX: datas e horas formatadas SEMPRE em Europe/Lisbon. Antes usava
 * getHours()/getDay() — no SSR da Vercel (UTC) e em browsers noutro
 * fuso (ex.: cliente no Brasil) a hora aparecia errada.
 */

import Link from 'next/link';
import { useCallback } from 'react';
import { buildIcs, googleCalendarUrl } from '@/lib/booking/calendar-links';

const TZ = 'Europe/Lisbon';

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

type Props = {
  bookingNumber: string;
  clientName: string;
  clientEmail: string;
  staffName: string;
  startTime: string; // ISO
  endTime: string; // ISO
  totalPrice: number;
  totalDuration: number;
  status: 'pending' | 'confirmed';
  cancellationWindowHours: number;
  services: Array<{
    name: string;
    duration: number;
    price: number;
  }>;
};

const LABEL =
  'text-chi-charcoal-light mb-1 block text-[10px] font-semibold tracking-[0.28em] uppercase';

export function BookingConfirmation({
  bookingNumber,
  clientName,
  clientEmail,
  staffName,
  startTime,
  endTime,
  totalPrice,
  totalDuration,
  status,
  cancellationWindowHours,
  services,
}: Props) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const firstName = clientName.split(/\s+/)[0];
  const pending = status === 'pending';

  const calendarEvent = {
    bookingNumber,
    start,
    end,
    services: services.map((s) => s.name).join(', '),
    staffName,
  };

  const downloadIcs = useCallback(() => {
    const blob = new Blob([buildIcs(calendarEvent)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chi-sublime-${bookingNumber}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // calendarEvent é derivado das props, que não mudam nesta página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingNumber, startTime, endTime]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 md:px-12 md:py-20">
      {/* Ícone */}
      <div className="mb-10 flex justify-center">
        <div className="relative">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full md:h-24 md:w-24"
            style={{ backgroundColor: pending ? '#B8924A' : '#1F3D2E' }}
          >
            {pending ? (
              <svg
                width="36"
                height="36"
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
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                stroke="#FAF7F2"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="8 19 14 25 28 11" />
              </svg>
            )}
          </div>
          <div className="border-chi-gold/40 absolute -inset-2 animate-pulse rounded-full border-2" />
        </div>
      </div>

      {/* Mensagem */}
      <header className="mb-10 text-center">
        <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
          {pending ? '— Pedido recebido —' : '— Reserva confirmada —'}
        </span>
        <h1 className="text-chi-charcoal mb-4 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
          Obrigada, <span className="text-chi-green-deep italic">{firstName}</span>.
        </h1>
        <p className="text-chi-charcoal-soft mx-auto max-w-md text-base leading-[1.85] md:text-lg">
          {pending
            ? 'Guardámos este horário para si. Vai receber um email assim que o salão confirmar.'
            : 'A sua reserva está confirmada. Estamos à sua espera.'}
        </p>
      </header>

      {/* Card de detalhes */}
      <div className="border-chi-gold/30 bg-chi-cream shadow-medium mb-8 overflow-hidden rounded-lg border">
        <div className="border-chi-border bg-chi-sand/40 border-b px-6 py-4 md:px-8">
          <span className={LABEL}>Número de reserva</span>
          <p className="text-chi-green-deep font-mono text-xl font-medium tracking-wide md:text-2xl">
            {bookingNumber}
          </p>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
          <div>
            <span className={LABEL}>Quando</span>
            <p className="text-chi-charcoal font-serif text-lg leading-tight md:text-xl">
              {capitalize(dateFmt.format(start))}
            </p>
            <p className="text-chi-green-deep mt-1 font-mono text-base">
              {timeFmt.format(start)} – {timeFmt.format(end)}
            </p>
          </div>

          <div className="border-chi-border border-t" />

          <div>
            <span className={LABEL}>Com</span>
            <p className="text-chi-charcoal font-serif text-lg md:text-xl">{staffName}</p>
          </div>

          <div className="border-chi-border border-t" />

          <div>
            <span className={`${LABEL} mb-3`}>Serviços</span>
            <ul className="space-y-2">
              {services.map((service, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-chi-charcoal font-serif text-base leading-snug">
                      {service.name}
                    </p>
                    <p className="text-chi-charcoal-light mt-0.5 text-xs">
                      {formatDuration(service.duration)}
                    </p>
                  </div>
                  <span className="text-chi-charcoal shrink-0 font-mono text-sm font-medium">
                    {formatPrice(service.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-chi-border border-t" />

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-chi-charcoal-light block text-[10px] font-semibold tracking-[0.28em] uppercase">
                Total
              </span>
              <span className="text-chi-charcoal-light text-xs italic">
                {formatDuration(totalDuration)}
              </span>
            </div>
            <span className="text-chi-green-deep font-mono text-3xl font-medium">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Adicionar ao calendário — só quando está confirmada */}
      {!pending && (
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={googleCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-chi-border hover:bg-chi-sand/40 inline-flex items-center justify-center rounded-md border text-xs font-medium tracking-[0.18em] uppercase transition-colors"
            style={{ padding: '12px 20px', color: '#1F3D2E' }}
          >
            Google Calendar
          </a>
          <button
            type="button"
            onClick={downloadIcs}
            className="border-chi-border hover:bg-chi-sand/40 inline-flex items-center justify-center rounded-md border text-xs font-medium tracking-[0.18em] uppercase transition-colors"
            style={{ padding: '12px 20px', color: '#1F3D2E' }}
          >
            Apple / Outlook (.ics)
          </button>
        </div>
      )}

      {/* Email */}
      <div
        className="border-chi-border bg-chi-sand/30 mb-10 rounded-md border"
        style={{ padding: '16px 20px' }}
      >
        <p className="text-chi-charcoal-soft text-center text-sm">
          {pending ? 'Vamos avisar em' : 'Confirmação enviada para'}{' '}
          <span className="text-chi-charcoal font-medium">{clientEmail}</span>
        </p>
        <p className="text-chi-charcoal-light mt-1 text-center text-xs italic">
          Pode alterar ou cancelar na sua conta até {cancellationWindowHours}h antes.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/conta/reservas"
          className="text-chi-charcoal-soft border-chi-border hover:bg-chi-sand/40 hover:text-chi-charcoal inline-flex items-center justify-center rounded-md border text-xs font-medium tracking-[0.22em] uppercase transition-colors"
          style={{ padding: '14px 32px' }}
        >
          As minhas reservas
        </Link>
        <Link
          href="/"
          className="bg-chi-green-deep hover:bg-chi-green-soft inline-flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
          style={{ color: '#FAF7F2', padding: '14px 32px' }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
