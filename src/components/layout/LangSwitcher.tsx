// 📄 src/components/layout/LangSwitcher.tsx
'use client';

/**
 * Chi Sublime — LangSwitcher (toggle PT | EN)
 * ============================================================
 *
 * Best practices aplicadas:
 * - Texto "PT | EN" em vez de bandeiras (bandeiras = países,
 *   não idiomas; 🇬🇧 confunde falantes de en-US, 🇵🇹 de pt-BR)
 * - Estado ativo visível (dourado + peso)
 * - a11y: aria-pressed no botão ativo, lang="" em cada label,
 *   aria-label descritivo no grupo
 * - useTransition → botões desativados durante a troca (evita
 *   double-click) com opacidade reduzida como feedback
 * - Persistência: Server Action grava cookie NEXT_LOCALE (1 ano)
 *   e router.refresh() re-renderiza os Server Components
 *
 * Cores críticas em inline style (regra Tailwind v4 + Next 16
 * do projeto).
 */

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';
import { setLocale } from '@/lib/server-actions/locale';

type LangSwitcherProps = {
  /** 'desktop' = compacto na navbar · 'mobile' = maior, no menu fullscreen */
  variant?: 'desktop' | 'mobile';
  /** true quando a navbar está em estado "scrolled" (para o text-shadow) */
  scrolled?: boolean;
};

const LANG_LABELS: Record<Locale, { label: string; aria: string }> = {
  pt: { label: 'PT', aria: 'Mudar para Português' },
  en: { label: 'EN', aria: 'Switch to English' },
};

export function LangSwitcher({ variant = 'desktop', scrolled = false }: LangSwitcherProps) {
  const activeLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch(locale: Locale) {
    if (locale === activeLocale || isPending) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh(); // re-renderiza Server Components no novo idioma
    });
  }

  const isMobile = variant === 'mobile';

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={isMobile ? 'flex items-center gap-3' : 'flex items-center gap-2'}
      style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 150ms' }}
    >
      {locales.map((locale, i) => {
        const isActive = locale === activeLocale;
        return (
          <span key={locale} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={isMobile ? 'mr-3' : 'mr-2'}
                style={{ color: 'rgba(250,247,242,0.35)' }}
              >
                |
              </span>
            )}
            <button
              type="button"
              lang={locale}
              aria-pressed={isActive}
              aria-label={LANG_LABELS[locale].aria}
              disabled={isPending}
              onClick={() => handleSwitch(locale)}
              className={
                isMobile
                  ? 'text-lg tracking-[0.18em] uppercase transition-colors'
                  : 'text-xs tracking-[0.18em] uppercase transition-colors'
              }
              style={{
                color: isActive ? '#C6A15B' : '#FAF7F2',
                fontWeight: isActive ? 600 : 400,
                cursor: isActive ? 'default' : 'pointer',
                textShadow: scrolled || isMobile ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              {LANG_LABELS[locale].label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
