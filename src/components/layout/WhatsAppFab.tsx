// 📄 src/components/layout/WhatsAppFab.tsx
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FaWhatsapp } from 'react-icons/fa6';
import { getCookieConsent } from '@/components/layout/CookieBanner';
import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';

/**
 * Botão flutuante "Falar por WhatsApp" — canto inferior direito.
 *
 * Boas práticas aplicadas:
 *  - Link oficial click-to-chat `https://wa.me/<E.164 sem +>?text=…`
 *    (abre a app no telemóvel e o WhatsApp Web no desktop) com
 *    mensagem pré-preenchida traduzida (PT/EN).
 *  - Só nas páginas públicas: escondido no admin, área de cliente,
 *    autenticação e no funil de marcações (para não tapar os CTAs
 *    "Continuar" do funil). Ver HIDDEN_PREFIXES.
 *  - Convive com o banner de cookies: só aparece depois do
 *    consentimento (evento `chi:cookie-consent`) e fica abaixo dele
 *    no z-index caso o banner seja reaberto.
 *  - Entrada suave com atraso (não compete com o hero) e respeito por
 *    `prefers-reduced-motion`.
 *  - Área de toque 56px, `env(safe-area-inset-bottom)` para iPhones
 *    com barra home, `aria-label` + etiqueta visível no hover/focus em
 *    desktop, foco visível por teclado.
 *  - Cores/padding críticos em `style` inline (padrão do projeto:
 *    Tailwind v4 + Next 16 deixa cair algumas classes em produção).
 *  - Ícone: `react-icons/fa6` (Font Awesome, MIT) — sem SVG à mão.
 *
 * Instalar dependência: npm i react-icons
 */

/** Rotas (prefixos) onde o botão NÃO aparece */
const HIDDEN_PREFIXES = [
  '/admin',
  '/conta',
  '/marcacoes',
  '/entrar',
  '/registar',
  '/recuperar-password',
  '/redefinir-password',
];

/** Atraso até aparecer (ms) — deixa o hero respirar primeiro */
const APPEAR_DELAY_MS = 1200;

/** Número em formato wa.me: só dígitos, com indicativo, sem "+" */
const WA_NUMBER = SALON_CONTACT_FALLBACK.phone.replace(/\D/g, '');

/** Store externo: consentimento de cookies (evento disparado pelo CookieBanner) */
function subscribeConsent(onChange: () => void) {
  window.addEventListener('chi:cookie-consent', onChange);
  return () => window.removeEventListener('chi:cookie-consent', onChange);
}
const getConsentSnapshot = () => getCookieConsent() !== null;
const getConsentServerSnapshot = () => false;

const WA_GREEN = '#25D366';
const WA_GREEN_HOVER = '#1EBE5D';

export function WhatsAppFab() {
  const pathname = usePathname();
  const t = useTranslations('whatsapp');

  // Consentimento de cookies — false no servidor (evita mismatch de hidratação),
  // lê o cookie no cliente e reage à decisão do banner
  const consented = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Entrada com atraso (uma vez por carregamento)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  const visible = consented && ready;
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t('message'))}`;

  return (
    <div
      className="fixed z-[90] flex items-center gap-3 print:hidden"
      style={{
        right: 'max(16px, env(safe-area-inset-right))',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        // Entrada: fade + scale; sai do fluxo de eventos enquanto invisível
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)',
        pointerEvents: visible ? 'auto' : 'none',
        transition:
          'opacity 400ms cubic-bezier(0.22,1,0.36,1), transform 400ms cubic-bezier(0.22,1,0.36,1)',
      }}
      aria-hidden={!visible}
    >
      {/* Etiqueta — só desktop, aparece no hover/focus */}
      <span
        className="pointer-events-none hidden text-xs font-medium tracking-[0.18em] uppercase select-none sm:block"
        style={{
          backgroundColor: '#1F3D2E',
          color: '#FAF7F2',
          padding: '10px 14px',
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(31,61,46,0.18)',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(8px)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
        aria-hidden
      >
        {t('label')}
      </span>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('label')}
        title={t('label')}
        tabIndex={visible ? 0 : -1}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-95"
        style={{
          width: 56,
          height: 56,
          backgroundColor: hovered ? WA_GREEN_HOVER : WA_GREEN,
          color: '#FFFFFF',
          boxShadow: hovered
            ? '0 12px 32px rgba(37,211,102,0.45), 0 2px 6px rgba(0,0,0,0.12)'
            : '0 8px 24px rgba(37,211,102,0.35), 0 2px 6px rgba(0,0,0,0.12)',
          transition: 'background-color 200ms ease, box-shadow 200ms ease, transform 200ms ease',
        }}
      >
        <FaWhatsapp size={30} aria-hidden />
      </a>
    </div>
  );
}
