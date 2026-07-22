// 📄 src/components/layout/CookieBanner.tsx
/**
 * Chi Sublime — CookieBanner (RGPD)
 * ============================================================
 *
 * Banner de consentimento alinhado com a identidade do site:
 * - Cantos retos, fundo cream, régua superior dourada
 * - Título em Fraunces (font-serif) + eyebrow dourado
 * - CTA principal dourado (mesma linguagem do botão "Reservar")
 * - "Rejeitar tudo" com igual destaque (exigência RGPD/CNPD)
 *
 * Preferências:
 * - Granular: necessários (fixo) / análise / marketing
 * - Persistidas em cookie `chi_cookie_consent` (12 meses,
 *   SameSite=Lax, Secure) — legível no servidor no futuro
 * - Toggles pré-carregam o consentimento existente
 * - Reabrível via openCookiePreferences() — usar num link
 *   "Gerir cookies" no footer ou na página /cookies
 * - Evento 'chi:cookie-consent' disparado a cada decisão
 *   (GA4/pixels devem ouvir este evento para arrancar)
 *
 * Cores críticas em inline style (bug Tailwind v4 + Next 16),
 * valores copiados dos tokens do globals.css.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/* ── Tokens (espelho do globals.css — cores críticas inline) ── */

const C = {
  greenDeep: '#1f3d2e',
  gold: '#d4af6e',
  goldDeep: '#b8924a',
  cream: '#faf7f2',
  sand: '#efe9dd',
  sandDeep: '#d9d2c2',
  charcoal: '#1a1a1a',
  charcoalSoft: '#5a5a5a',
  border: '#e8e4da',
} as const;

/* ── Consentimento ─────────────────────────────────────────── */

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  version: number;
  timestamp: string;
};

const CONSENT_COOKIE = 'chi_cookie_consent';
const CONSENT_VERSION = 1; // incrementar → re-pede consentimento a todos
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 12 meses (recomendação CNPD)
const OPEN_EVENT = 'chi:open-cookie-preferences';

/** Lê o consentimento atual (client-side). Null = ainda não decidiu. */
export function getCookieConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CookieConsent;
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/** Reabre o banner em modo "Personalizar" (ex.: link "Gerir cookies"). */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

function persistConsent(analytics: boolean, marketing: boolean): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    marketing,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(consent),
  )}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent('chi:cookie-consent', { detail: consent }));
  return consent;
}

/* ── Toggle (switch acessível, linguagem do site) ──────────── */

function ConsentToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4">
      <div>
        <p className="text-[13px] font-semibold tracking-[0.04em]" style={{ color: C.charcoal }}>
          {label}
          {disabled && (
            <span
              className="ml-2 text-[10px] font-medium tracking-[0.18em] uppercase"
              style={{ color: C.goldDeep }}
            >
              ✓
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.charcoalSoft }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="relative mt-1 h-[22px] w-11 shrink-0 transition-colors duration-300 disabled:cursor-not-allowed"
        style={{
          backgroundColor: checked ? C.greenDeep : C.sandDeep,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span
          className="absolute top-[3px] h-4 w-4 transition-all duration-300"
          style={{
            left: checked ? '25px' : '3px',
            backgroundColor: checked ? C.gold : C.cream,
          }}
        />
      </button>
    </div>
  );
}

/* ── Banner ────────────────────────────────────────────────── */

export function CookieBanner() {
  const t = useTranslations('cookies');

  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Primeira visita → mostra banner (após mount, evita mismatch de hidratação)
  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  // Reabertura via openCookiePreferences() — pré-carrega o consentimento atual
  const handleOpen = useCallback(() => {
    const current = getCookieConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    setCustomizing(true);
    setVisible(true);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, [handleOpen]);

  if (!visible) return null;

  const decide = (a: boolean, m: boolean) => {
    persistConsent(a, m);
    setVisible(false);
    setCustomizing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('title')}
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div
        className="animate-in slide-in-from-bottom-4 fade-in mx-auto w-full max-w-2xl shadow-2xl duration-500"
        style={{
          backgroundColor: C.cream,
          borderTop: `2px solid ${C.gold}`,
          border: `1px solid ${C.border}`,
          borderTopColor: C.gold,
          borderTopWidth: '2px',
        }}
      >
        <div className="p-6 sm:p-8">
          {/* Eyebrow + título — mesma hierarquia das secções do site */}
          <span
            className="mb-3 block text-[10px] font-semibold tracking-[0.28em] uppercase"
            style={{ color: C.goldDeep }}
          >
            Chi Sublime
          </span>
          <h2 className="mb-3 font-serif text-xl" style={{ color: C.greenDeep }}>
            {t('title')}
          </h2>
          <p className="mb-6 max-w-lg text-sm leading-[1.8]" style={{ color: C.charcoalSoft }}>
            {t('description')}{' '}
            <Link
              href="/cookies"
              className="underline underline-offset-2 transition-colors duration-300 hover:opacity-80"
              style={{ color: C.goldDeep }}
            >
              {t('policyLink')}
            </Link>
          </p>

          {/* Painel de personalização */}
          {customizing && (
            <div className="mb-6 divide-y border-t border-b" style={{ borderColor: C.border }}>
              <ConsentToggle
                label={t('necessary')}
                description={t('necessaryDescription')}
                checked
                disabled
              />
              <ConsentToggle
                label={t('analytics')}
                description={t('analyticsDescription')}
                checked={analytics}
                onChange={setAnalytics}
              />
              <ConsentToggle
                label={t('marketing')}
                description={t('marketingDescription')}
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          {/* Ações — CTA dourado (linguagem "Reservar"); rejeitar com igual peso */}
          <div className="flex flex-wrap items-center gap-3">
            {customizing ? (
              <button
                type="button"
                onClick={() => decide(analytics, marketing)}
                className="px-8 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase transition-opacity duration-300 hover:opacity-90"
                style={{ backgroundColor: C.gold, color: C.greenDeep }}
              >
                {t('savePreferences')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => decide(true, true)}
                className="px-8 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase transition-opacity duration-300 hover:opacity-90"
                style={{ backgroundColor: C.gold, color: C.greenDeep }}
              >
                {t('acceptAll')}
              </button>
            )}
            <button
              type="button"
              onClick={() => decide(false, false)}
              className="border px-8 py-3.5 text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors duration-300 hover:opacity-80"
              style={{ borderColor: C.greenDeep, color: C.greenDeep }}
            >
              {t('rejectAll')}
            </button>
            {!customizing && (
              <button
                type="button"
                onClick={() => {
                  const current = getCookieConsent();
                  setAnalytics(current?.analytics ?? false);
                  setMarketing(current?.marketing ?? false);
                  setCustomizing(true);
                }}
                className="px-4 py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase underline underline-offset-4 transition-opacity duration-300 hover:opacity-80"
                style={{ color: C.charcoalSoft }}
              >
                {t('customize')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
