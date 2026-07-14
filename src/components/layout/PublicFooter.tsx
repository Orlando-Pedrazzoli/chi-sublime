// 📄 src/components/layout/PublicFooter.tsx
/**
 * Chi Sublime — PublicFooter
 * ============================================================
 *
 * Estrutura de 4 colunas mantida; refinamentos:
 *  - Marca sem itálico (coerente com navbar)
 *  - "Reservar Online" agora aponta para /reservar (era #contact)
 *  - Socials quadrados de cantos retos (linguagem do site)
 */

import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Início', href: '#home' },
  { label: 'Serviços', href: '#services' },
  { label: 'Equipa', href: '#team' },
  { label: 'Galeria', href: '#gallery' },
  { label: 'Contacto', href: '#contact' },
];

const BOOKING_LINKS = [
  { label: 'Reservar Online', href: '/reservar' },
  { label: 'A Minha Conta', href: '/conta' },
  { label: 'Política de Cancelamento', href: '/cancelamento' },
];

const LEGAL_LINKS = [
  { label: 'Privacidade', href: '/privacidade' },
  { label: 'Termos', href: '/termos' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'RGPD', href: '/rgpd' },
];

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-chi-sand border-chi-gold/30 text-chi-charcoal-soft border-t px-6 pt-16 pb-8 md:px-12 md:pt-20">
      <div className="mx-auto max-w-7xl">
        {/* Grid principal — 4 colunas em desktop */}
        <div className="mb-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Coluna 1 — Marca + Socials
              Mesmo lockup vertical da navbar (logo-mark + SUBLIME
              em HTML). No fundo areia, o texto usa gold-deep. */}
          <div>
            <Link
              href="#home"
              className="mb-6 inline-flex flex-col items-center transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/logo_new.png"
                alt="Chi Sublime"
                width={63}
                height={40}
                className="h-10 w-auto"
              />
              <span
                className="mt-1 text-[9px] font-medium uppercase"
                style={{
                  color: '#B8924A',
                  letterSpacing: '0.42em',
                  marginRight: '-0.42em',
                }}
              >
                Sublime
              </span>
            </Link>
            <p className="text-chi-charcoal-soft mb-8 max-w-xs text-sm leading-[1.9]">
              Hair Style &amp; Beauty
              <br />
              Um refúgio sensorial em Cascais.
            </p>

            {/* Socials — quadrados retos */}
            <div className="flex gap-3">
              <Link
                href="https://www.instagram.com/chiptsublime/"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="border-chi-gold-deep/40 text-chi-gold-deep hover:bg-chi-green-deep hover:border-chi-green-deep flex h-10 w-10 items-center justify-center border transition-colors duration-300 hover:text-[#FAF7F2]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </Link>
              <Link
                href="https://facebook.com/chisublime"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
                className="border-chi-gold-deep/40 text-chi-gold-deep hover:bg-chi-green-deep hover:border-chi-green-deep flex h-10 w-10 items-center justify-center border transition-colors duration-300 hover:text-[#FAF7F2]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Link>
              <Link
                href="https://wa.me/351932932691"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
                className="border-chi-gold-deep/40 text-chi-gold-deep hover:bg-chi-green-deep hover:border-chi-green-deep flex h-10 w-10 items-center justify-center border transition-colors duration-300 hover:text-[#FAF7F2]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Coluna 2 — Navegação */}
          <div>
            <h6 className="text-chi-green-deep mb-6 text-xs font-semibold tracking-[0.25em] uppercase">
              Navegação
            </h6>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-chi-green-deep text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 3 — Reservas */}
          <div>
            <h6 className="text-chi-green-deep mb-6 text-xs font-semibold tracking-[0.25em] uppercase">
              Reservas
            </h6>
            <ul className="space-y-3">
              {BOOKING_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-chi-green-deep text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 4 — Legal */}
          <div>
            <h6 className="text-chi-green-deep mb-6 text-xs font-semibold tracking-[0.25em] uppercase">
              Legal
            </h6>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-chi-green-deep text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="border-chi-charcoal/10 text-chi-charcoal-light flex flex-col gap-4 border-t pt-8 text-xs sm:flex-row sm:justify-between">
          <span>© {currentYear} Chi Sublime · Todos os direitos reservados</span>
          <span className="flex items-center gap-2">
            Desenvolvido por{' '}
            <Link
              href="https://pedrazzolidigital.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-chi-gold-deep hover:text-chi-green-deep transition-colors"
            >
              Pedrazzoli Digital
            </Link>
            <Link
              href="/admin/login"
              aria-label="Painel"
              title="Painel"
              className="text-chi-gold-deep/50 hover:text-chi-green-deep ml-1 inline-flex items-center transition-colors"
            >
              <Lock size={12} strokeWidth={1.5} />
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
