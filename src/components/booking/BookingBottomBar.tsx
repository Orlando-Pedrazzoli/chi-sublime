// 📄 src/components/booking/BookingBottomBar.tsx
'use client';

/**
 * Chi Sublime — Booking Bottom Bar (mobile, tipo app)
 * ============================================================
 *
 * Barra de ação FIXA no fundo do ecrã, presente nos 3 passos do
 * funil de marcações em mobile/tablet (< 1024px). É a "zona do
 * polegar": o cliente avança sempre no mesmo sítio, sem procurar o
 * botão no fim da página.
 *
 *  ┌──────────────────────────────────────────────┐
 *  │ 2 serviços · 1h 30min          ┌───────────┐ │
 *  │ 45,00 € ⌃                      │ Continuar→│ │
 *  └──────────────────────────────────────────────┘
 *
 * Boas práticas aplicadas:
 *  - SEMPRE visível (não aparece/desaparece): o cliente percebe
 *    desde o primeiro ecrã onde vai avançar.
 *  - Um único botão principal por ecrã, com 52px de altura.
 *  - Quando ainda falta uma escolha, o botão fica cinzento mas
 *    continua tocável: a etiqueta à esquerda diz O QUE falta
 *    ("Escolha uma data") e o toque no botão chama a atenção para
 *    ela e leva o cliente à secção em falta (`onBlockedPress`).
 *    Um botão morto, sem explicação, é um beco sem saída.
 *  - Preço total sempre à vista; toque no resumo abre uma folha
 *    inferior (bottom sheet) com o detalhe — no passo 1 permite
 *    remover serviços sem fazer scroll até à lista.
 *  - Área segura do iPhone (`env(safe-area-inset-bottom)`),
 *    Escape/toque fora fecham a folha, foco devolvido ao resumo,
 *    scroll da página bloqueado enquanto a folha está aberta.
 *
 * Em desktop não aparece (`bk-mobile-only`) — aí vive a sidebar
 * (BookingSummary) e os botões no fim de cada passo.
 * Estilos em globals.css (secção "MARCAÇÕES — funil do cliente em
 * mobile") — padding/cores críticos fora das classes do Tailwind.
 */

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

export type BookingBarCta =
  /** Avança para outra página do funil */
  | { kind: 'link'; href: string; label: string }
  /** Submete o <form> onde a barra está inserida (passo 3) */
  | { kind: 'submit'; label: string; loading?: boolean; loadingLabel?: string };

type Props = {
  /**
   * Linha de contexto por cima do preço. Quando `ready` é false deve
   * dizer o que falta para avançar (ex.: "Escolha uma data").
   */
  label: string;
  /** O cliente já pode avançar neste passo? */
  ready: boolean;
  /** Botão principal */
  cta: BookingBarCta;
  /** Toque no botão quando `ready` é false (ex.: scroll até à secção em falta) */
  onBlockedPress?: () => void;
  /** Permitir remover serviços na folha de resumo (só no passo 1) */
  allowRemove?: boolean;
  /** Linhas extra da folha de resumo (passos 2 e 3) */
  details?: {
    staffName?: string | null;
    dateTime?: string | null;
  };
};

export function BookingBottomBar({
  label,
  ready,
  cta,
  onBlockedPress,
  allowRemove = false,
  details,
}: Props) {
  const t = useTranslations('booking');
  const isHydrated = useIsHydrated();
  const { selectedServices, totals, removeService } = useBookingFlow();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const infoRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const hasServices = totals.count > 0;

  // Folha aberta: bloqueia o scroll da página, fecha com Escape e
  // leva o foco para dentro da folha (leitores de ecrã / teclado).
  useEffect(() => {
    if (!sheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false);
        infoRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [sheetOpen]);

  const closeSheet = () => {
    setSheetOpen(false);
    infoRef.current?.focus();
  };

  const handleBlockedPress = () => {
    setNudge(true);
    onBlockedPress?.();
  };

  // ------------------------------------------------------------
  // Botão principal
  // ------------------------------------------------------------
  const arrow = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  let ctaNode: React.ReactNode;
  if (!isHydrated || !ready) {
    // Ainda falta uma escolha (ou o carrinho ainda não foi lido do
    // sessionStorage): cinzento mas tocável — explica em vez de calar.
    ctaNode = (
      <button
        type="button"
        className="bk-bar-cta"
        aria-disabled="true"
        aria-describedby={`${titleId}-label`}
        onClick={isHydrated ? handleBlockedPress : undefined}
      >
        {cta.label}
        {cta.kind === 'link' && arrow}
      </button>
    );
  } else if (cta.kind === 'link') {
    ctaNode = (
      <Link href={cta.href} className="bk-bar-cta">
        {cta.label}
        {arrow}
      </Link>
    );
  } else {
    ctaNode = (
      <button
        type="submit"
        className="bk-bar-cta"
        disabled={cta.loading}
        data-loading={cta.loading || undefined}
      >
        {cta.loading ? (
          <>
            <span className="bk-spinner" aria-hidden="true" />
            {cta.loadingLabel ?? cta.label}
          </>
        ) : (
          cta.label
        )}
      </button>
    );
  }

  return (
    <div className="bk-mobile-only">
      {/* ---------- Barra fixa ---------- */}
      <div className="bk-bar" data-booking-bar>
        <div className="bk-bar-inner">
          <button
            ref={infoRef}
            type="button"
            className="bk-bar-info"
            onClick={() => setSheetOpen(true)}
            disabled={!isHydrated || !hasServices}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            title={hasServices ? t('app.summaryOpen') : undefined}
          >
            {!isHydrated ? (
              <>
                <span className="bk-bar-skeleton" style={{ width: 96, height: 11 }} />
                <span className="bk-bar-skeleton" style={{ marginTop: 6 }} />
              </>
            ) : (
              <>
                <span
                  id={`${titleId}-label`}
                  className="bk-bar-label"
                  data-attention={!ready || undefined}
                  data-nudge={nudge || undefined}
                  onAnimationEnd={() => setNudge(false)}
                >
                  {label}
                </span>
                {hasServices && (
                  <span className="bk-bar-value">
                    {formatPrice(totals.price)}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 15 12 9 18 15" />
                    </svg>
                  </span>
                )}
              </>
            )}
          </button>

          {ctaNode}
        </div>
      </div>

      {/* ---------- Folha de resumo ---------- */}
      <button
        type="button"
        className="bk-sheet-backdrop"
        data-open={sheetOpen || undefined}
        onClick={closeSheet}
        aria-label={t('app.summaryClose')}
        tabIndex={-1}
      />
      <div
        className="bk-sheet"
        data-open={sheetOpen || undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!sheetOpen}
      >
        <div className="bk-sheet-grabber" aria-hidden="true" />
        <div className="bk-sheet-head">
          <h2 id={titleId} className="bk-sheet-title">
            {t('summary.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="bk-icon-btn"
            onClick={closeSheet}
            aria-label={t('app.summaryClose')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="bk-sheet-body">
          {hasServices ? (
            <>
              <ul className="bk-sheet-list">
                {selectedServices.map((service) => (
                  <li key={service.id} className="bk-sheet-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="bk-sheet-item-name">{service.name}</p>
                      <p className="bk-sheet-item-meta">{formatDuration(service.duration)}</p>
                    </div>
                    <span className="bk-sheet-price">{formatPrice(service.price)}</span>
                    {allowRemove && (
                      <button
                        type="button"
                        className="bk-icon-btn bk-sheet-remove"
                        onClick={() => removeService(service.id)}
                        aria-label={t('summary.removeAria', { name: service.name })}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {details?.staffName && (
                <div className="bk-sheet-row">
                  <span>{t('app.professional')}</span>
                  <strong>{details.staffName}</strong>
                </div>
              )}
              {details?.dateTime && (
                <div className="bk-sheet-row">
                  <span>{t('app.dateTime')}</span>
                  <strong>{details.dateTime}</strong>
                </div>
              )}
              <div className="bk-sheet-row">
                <span>{t('summary.totalDuration')}</span>
                <strong>{formatDuration(totals.duration)}</strong>
              </div>
              <div className="bk-sheet-row bk-sheet-total">
                <span>{t('summary.total')}</span>
                <strong>{formatPrice(totals.price)}</strong>
              </div>

              {/* Passos 2 e 3: os serviços mudam-se no passo 1 */}
              {!allowRemove && (
                <Link href="/marcacoes" className="bk-sheet-link">
                  {t('app.editServices')}
                </Link>
              )}
            </>
          ) : (
            <p className="bk-sheet-empty">{t('summary.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
