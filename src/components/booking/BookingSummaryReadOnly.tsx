'use client';

/**
 * Chi Sublime — Booking Summary (Read-Only)
 * ============================================================
 *
 * Resumo da reserva sem possibilidade de editar (usado no Step 3).
 * Mostra servicos, profissional, data/hora, total.
 *
 * Layout em card creme com bordas elegantes.
 */

import { useBookingFlow, useIsHydrated } from '@/hooks/useBookingFlow';

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

function formatDateLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[month - 1];
  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

export function BookingSummaryReadOnly() {
  const isHydrated = useIsHydrated();
  const { selectedServices, date, time, assignedStaffName, totals } = useBookingFlow();

  if (!isHydrated) {
    return (
      <div className="border-chi-border bg-chi-cream shadow-soft rounded-lg border p-6">
        <div className="bg-chi-sand/40 h-32 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="border-chi-border bg-chi-cream shadow-soft rounded-lg border p-6 md:p-7">
      <h3 className="text-chi-charcoal mb-5 font-serif text-xl">Resumo da reserva</h3>

      <ul className="border-chi-border mb-5 space-y-3 border-b pb-5">
        {selectedServices.map((service) => (
          <li key={service.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-chi-charcoal font-serif text-base leading-snug">{service.name}</p>
              <p className="text-chi-charcoal-light mt-0.5 text-xs">
                {formatDuration(service.duration)}
              </p>
            </div>
            <span className="text-chi-green-deep shrink-0 font-mono text-sm font-medium">
              {formatPrice(service.price)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-chi-border mb-5 space-y-3 border-b pb-5">
        <div className="flex items-start gap-3">
          <span className="text-chi-charcoal-light mt-1 w-24 shrink-0 text-[10px] font-semibold tracking-[0.22em] uppercase">
            Profissional
          </span>
          <span className="text-chi-charcoal font-serif text-base">{assignedStaffName || '—'}</span>
        </div>

        {date && (
          <div className="flex items-start gap-3">
            <span className="text-chi-charcoal-light mt-1 w-24 shrink-0 text-[10px] font-semibold tracking-[0.22em] uppercase">
              Data
            </span>
            <span className="text-chi-charcoal font-serif text-base">
              {formatDateLong(date)}
              {time && (
                <>
                  {' · '}
                  <span className="font-mono">{time}</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-chi-charcoal-soft">Duração total</span>
          <span className="text-chi-charcoal font-medium">{formatDuration(totals.duration)}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-chi-charcoal-soft text-sm">Total</span>
          <span className="text-chi-green-deep font-mono text-2xl font-medium">
            {formatPrice(totals.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
