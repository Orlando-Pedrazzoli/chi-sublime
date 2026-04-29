'use client';

/**
 * Chi Sublime — Booking Confirmation
 * ============================================================
 *
 * Componente de display da pagina de sucesso da reserva.
 * Mostra:
 *  - Icone de check animado
 *  - Mensagem personalizada com nome do cliente
 *  - Card com detalhes da reserva
 *  - CTAs: voltar a home, etc
 */

import Link from 'next/link';

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

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

function formatDateLong(date: Date): string {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  return `${weekday}, ${date.getDate()} de ${monthName} de ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

type Props = {
  bookingNumber: string;
  clientName: string;
  clientEmail: string;
  staffName: string;
  startTime: string; // ISO string (vai virar Date)
  totalPrice: number;
  totalDuration: number;
  services: Array<{
    name: string;
    duration: number;
    price: number;
  }>;
};

export function BookingConfirmation({
  bookingNumber,
  clientName,
  clientEmail,
  staffName,
  startTime,
  totalPrice,
  totalDuration,
  services,
}: Props) {
  const dateObj = new Date(startTime);
  const firstName = clientName.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 md:px-12 md:py-20">
      {/* Icone de sucesso */}
      <div className="mb-10 flex justify-center">
        <div className="relative">
          <div className="bg-chi-green-deep flex h-20 w-20 items-center justify-center rounded-full md:h-24 md:w-24">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              stroke="#FAF7F2"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="8 19 14 25 28 11" />
            </svg>
          </div>
          <div className="border-chi-gold/40 absolute -inset-2 animate-pulse rounded-full border-2" />
        </div>
      </div>

      {/* Mensagem */}
      <header className="mb-10 text-center">
        <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
          — Reserva confirmada —
        </span>
        <h1 className="text-chi-charcoal mb-4 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
          Obrigada, <span className="text-chi-green-deep italic">{firstName}</span>.
        </h1>
        <p className="text-chi-charcoal-soft mx-auto max-w-md text-base leading-[1.85] md:text-lg">
          A sua reserva foi confirmada. Estamos à sua espera.
        </p>
      </header>

      {/* Card de detalhes */}
      <div className="border-chi-gold/30 bg-chi-cream shadow-medium mb-10 overflow-hidden rounded-lg border">
        <div className="border-chi-border bg-chi-sand/40 border-b px-6 py-4 md:px-8">
          <span className="text-chi-charcoal-light mb-1 block text-[10px] font-semibold tracking-[0.28em] uppercase">
            Número de reserva
          </span>
          <p className="text-chi-green-deep font-mono text-xl font-medium tracking-wide md:text-2xl">
            {bookingNumber}
          </p>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
          {/* Data e hora */}
          <div>
            <span className="text-chi-charcoal-light mb-1 block text-[10px] font-semibold tracking-[0.28em] uppercase">
              Quando
            </span>
            <p className="text-chi-charcoal font-serif text-lg leading-tight md:text-xl">
              {formatDateLong(dateObj)}
            </p>
            <p className="text-chi-green-deep mt-1 font-mono text-base">{formatTime(dateObj)}</p>
          </div>

          <div className="border-chi-border border-t" />

          {/* Profissional */}
          <div>
            <span className="text-chi-charcoal-light mb-1 block text-[10px] font-semibold tracking-[0.28em] uppercase">
              Com
            </span>
            <p className="text-chi-charcoal font-serif text-lg md:text-xl">{staffName}</p>
          </div>

          <div className="border-chi-border border-t" />

          {/* Servicos */}
          <div>
            <span className="text-chi-charcoal-light mb-3 block text-[10px] font-semibold tracking-[0.28em] uppercase">
              Serviços
            </span>
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

          {/* Total */}
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

      {/* Email mensagem */}
      <div className="border-chi-border bg-chi-sand/30 mb-10 rounded-md border px-5 py-4">
        <p className="text-chi-charcoal-soft text-center text-sm">
          <span className="text-chi-charcoal font-medium">📧</span> Detalhes enviados para{' '}
          <span className="text-chi-charcoal font-medium">{clientEmail}</span>
        </p>
        <p className="text-chi-charcoal-light mt-1 text-center text-xs italic">
          Pode cancelar até 24h antes da reserva.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/"
          className="text-chi-charcoal-soft border-chi-border hover:bg-chi-sand/40 hover:text-chi-charcoal inline-flex items-center justify-center rounded-md border px-8 py-3.5 text-xs font-medium tracking-[0.22em] uppercase transition-colors"
        >
          Voltar à home
        </Link>
        <Link
          href="/reservar"
          className="bg-chi-green-deep hover:bg-chi-green-soft inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
          style={{ color: '#FAF7F2' }}
        >
          Nova reserva
        </Link>
      </div>
    </div>
  );
}
