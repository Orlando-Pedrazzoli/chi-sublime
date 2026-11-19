// 📄 src/components/booking/BookingSummary.tsx
'use client';

/**
 * Chi Sublime — Booking Summary (Step 1)
 * ============================================================
 *
 * Resumo do que o cliente esta a marcar.
 *
 * Comportamento responsive:
 *  - Desktop (>= 1024px): sticky sidebar a direita
 *  - Mobile/tablet: barra de ação fixa no fundo, tipo app
 *    (<BookingBottomBar />) — SEMPRE visível; sem serviços diz
 *    "Escolha um serviço" e o botão fica cinzento. Toque no resumo
 *    abre a folha com os serviços escolhidos (com remover).
 *
 * Mostra (desktop):
 *  - Servicos selecionados (com remover X)
 *  - Duracao total
 *  - Preco total
 *  - Botao CTA principal (auto-disabled se sem servicos)
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useBookingFlow, useIsHydrated } from '@/hooks/useBookingFlow';
import { BookingBottomBar } from './BookingBottomBar';

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

type Props = {
  /** Texto do botao CTA */
  ctaLabel: string;
  /** Para onde o CTA leva */
  ctaHref: string;
  /** Texto opcional secundario abaixo do botao */
  ctaHelper?: string;
};

/** Mobile: toque no botão sem serviços → leva o cliente de volta à lista */
function scrollToServices() {
  document.getElementById('booking-services')?.scrollIntoView({ block: 'start' });
}

export function BookingSummary({ ctaLabel, ctaHref, ctaHelper }: Props) {
  const t = useTranslations('booking.summary');
  const ta = useTranslations('booking.app');
  const isHydrated = useIsHydrated();
  const { selectedServices, totals, removeService, canProceedFromStep1 } = useBookingFlow();

  const hasServices = selectedServices.length > 0;
  const ctaEnabled = canProceedFromStep1;

  // MOBILE — barra de ação fixa (a própria barra trata da hidratação:
  // mostra um esqueleto até o carrinho ser lido do sessionStorage)
  const mobileBar = (
    <BookingBottomBar
      label={
        hasServices
          ? `${t('servicesCount', { count: totals.count })} · ${formatDuration(totals.duration)}`
          : ta('chooseService')
      }
      ready={ctaEnabled}
      cta={{ kind: 'link', href: ctaHref, label: ctaLabel }}
      onBlockedPress={scrollToServices}
      allowRemove
    />
  );

  // Antes da hidratacao, mostra placeholder vazio (evita SSR mismatch)
  if (!isHydrated) {
    return (
      <>
        <aside className="hidden w-full lg:block">
          <div className="border-chi-border bg-chi-cream shadow-soft sticky top-24 rounded-lg border p-8">
            <div className="bg-chi-sand/40 h-32 animate-pulse rounded" />
          </div>
        </aside>
        {mobileBar}
      </>
    );
  }

  return (
    <>
      {/* DESKTOP — sticky sidebar */}
      <aside className="hidden w-full lg:block">
        <div className="border-chi-border bg-chi-cream shadow-soft sticky top-24 rounded-lg border p-8">
          <h3 className="text-chi-charcoal mb-6 font-serif text-xl">{t('title')}</h3>

          {hasServices ? (
            <>
              <ul className="border-chi-border mb-6 space-y-4 border-b pb-6">
                {selectedServices.map((service) => (
                  <li key={service.id} className="group flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-chi-charcoal font-serif text-base leading-snug">
                        {service.name}
                      </p>
                      <p className="text-chi-charcoal-light mt-1 text-xs">
                        {formatDuration(service.duration)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-chi-green-deep font-mono text-sm font-medium">
                        {formatPrice(service.price)}
                      </span>
                      <button
                        onClick={() => removeService(service.id)}
                        className="text-chi-charcoal-light hover:text-chi-danger -mr-1 p-1 transition-colors"
                        aria-label={t('removeAria', { name: service.name })}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        >
                          <path d="M3 3l8 8M11 3l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mb-7 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-chi-charcoal-soft">{t('totalDuration')}</span>
                  <span className="text-chi-charcoal font-medium">
                    {formatDuration(totals.duration)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-chi-charcoal-soft text-sm">{t('total')}</span>
                  <span className="text-chi-green-deep font-mono text-2xl font-medium">
                    {formatPrice(totals.price)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-chi-charcoal-light mb-7 text-sm leading-relaxed italic">
              {t('empty')}
            </p>
          )}

          {ctaEnabled ? (
            <Link
              href={ctaHref}
              className="bg-chi-green-deep hover:bg-chi-green-soft hover:shadow-medium block w-full rounded-md px-6 py-4 text-center text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
              style={{ color: '#FAF7F2' }}
            >
              {ctaLabel}
              <span className="ml-2">→</span>
            </Link>
          ) : (
            <button
              disabled
              className="bg-chi-charcoal-light/40 block w-full cursor-not-allowed rounded-md px-6 py-4 text-center text-xs font-semibold tracking-[0.22em] uppercase"
              style={{ color: '#FAF7F2' }}
            >
              {ctaLabel}
            </button>
          )}

          {ctaHelper && (
            <p className="text-chi-charcoal-light mt-4 text-center text-[11px] leading-relaxed italic">
              {ctaHelper}
            </p>
          )}
        </div>
      </aside>

      {mobileBar}
    </>
  );
}
