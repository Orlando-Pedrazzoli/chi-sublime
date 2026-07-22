// 📄 src/components/layout/CookieBanner.tsx
/**
 * Chi Sublime — CookieBanner (RGPD) · v3 final
 * ============================================================
 *
 * Corner card compacto (mobile: fundo do ecrã; desktop: canto
 * inferior esquerdo, 400px). Boas práticas:
 * - Texto curto, ações visíveis sem scroll
 * - "Rejeitar tudo" com igual acesso a "Aceitar tudo" (RGPD)
 * - Consentimento granular em "Personalizar"
 * - Botões SEMPRE numa linha (whiteSpace: nowrap)
 *
 * Persistência: cookie `chi_cookie_consent` (12 meses).
 * Reabrível via openCookiePreferences(). Evento
 * 'chi:cookie-consent' disparado a cada decisão.
 *
 * ⚠️ Padding, border-radius e cores em INLINE STYLE
 * (bug Tailwind v4 + Next 16 ignora classes de spacing/cor).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/* ── Tokens (espelho do globals.css) ───────────────────────── */

const C = {
  greenDeep: '#1f3d2e',
  gold: '#d4af6e',
  goldDeep: '#b8924a',
  cream: '#faf7f2',
  sandDeep: '#d9d2c2',
  charcoal: '#1a1a1a',
  charcoalSoft: '#5a5a5a',
  border: '#e8e4da',
} as const;

const RADIUS_CARD = '12px';
const RADIUS_BTN = '8px';

/* Estilo base partilhado pelos botões de ação — garante 1 linha */
const BTN_BASE: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: RADIUS_BTN,
  whiteSpace: 'nowrap',
  fontSize: '11px',
  letterSpacing: '0.08em',
};

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

/* ── Toggle compacto ───────────────────────────────────────── */

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
    <div className="flex items-start justify-between gap-4" style={{ padding: '10px 0' }}>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: C.charcoal }}>
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: C.charcoalSoft }}>
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
        className="relative shrink-0 transition-colors duration-300 disabled:cursor-not-allowed"
        style={{
          marginTop: '2px',
          height: '22px',
          width: '42px',
          borderRadius: '999px',
          backgroundColor: checked ? C.greenDeep : C.sandDeep,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <span
          className="absolute transition-all duration-300"
          style={{
            top: '3px',
            left: checked ? '23px' : '3px',
            height: '16px',
            width: '16px',
            borderRadius: '999px',
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

  const openCustomize = () => {
    const current = getCookieConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    setCustomizing(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('title')}
      className="fixed bottom-0 left-0 z-[100] w-full sm:right-6 sm:bottom-6 sm:left-auto sm:w-[400px]"
      style={{ padding: '0 12px 12px' }}
    >
      <div
        className="shadow-2xl"
        style={{
          backgroundColor: C.cream,
          border: `1px solid ${C.border}`,
          borderTop: `2px solid ${C.gold}`,
          borderRadius: RADIUS_CARD,
          padding: '18px 20px 20px',
        }}
      >
        <h2
          className="font-serif"
          style={{ color: C.greenDeep, fontSize: '17px', marginBottom: '6px' }}
        >
          {t('title')}
        </h2>
        <p
          className="leading-relaxed"
          style={{ color: C.charcoalSoft, fontSize: '13px', marginBottom: '14px' }}
        >
          {t('description')}{' '}
          <Link
            href="/cookies"
            className="underline underline-offset-2 hover:opacity-80"
            style={{ color: C.goldDeep }}
          >
            {t('policyLink')}
          </Link>
        </p>

        {/* Painel de personalização */}
        {customizing && (
          <div
            className="divide-y"
            style={{
              borderTop: `1px solid ${C.border}`,
              borderBottom: `1px solid ${C.border}`,
              marginBottom: '14px',
            }}
          >
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

        {/* Ações — lado a lado, SEMPRE numa linha cada */}
        <div className="flex items-stretch gap-2.5">
          {customizing ? (
            <button
              type="button"
              onClick={() => decide(analytics, marketing)}
              className="flex-1 font-semibold uppercase transition-opacity duration-300 hover:opacity-90"
              style={{ ...BTN_BASE, backgroundColor: C.gold, color: C.greenDeep }}
            >
              {t('savePreferences')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decide(true, true)}
              className="flex-1 font-semibold uppercase transition-opacity duration-300 hover:opacity-90"
              style={{ ...BTN_BASE, backgroundColor: C.gold, color: C.greenDeep }}
            >
              {t('acceptAll')}
            </button>
          )}
          <button
            type="button"
            onClick={() => decide(false, false)}
            className="flex-1 font-semibold uppercase transition-colors duration-300 hover:opacity-80"
            style={{
              ...BTN_BASE,
              border: `1px solid ${C.greenDeep}`,
              color: C.greenDeep,
              backgroundColor: 'transparent',
            }}
          >
            {t('rejectAll')}
          </button>
        </div>

        {/* Personalizar — link discreto por baixo */}
        {!customizing && (
          <button
            type="button"
            onClick={openCustomize}
            className="font-medium uppercase underline underline-offset-4 hover:opacity-80"
            style={{
              color: C.charcoalSoft,
              marginTop: '12px',
              padding: '2px 0',
              fontSize: '11px',
              letterSpacing: '0.08em',
            }}
          >
            {t('customize')}
          </button>
        )}
      </div>
    </div>
  );
}
