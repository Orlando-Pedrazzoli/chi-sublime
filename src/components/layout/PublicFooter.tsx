// ðŸ“„ src/components/layout/PublicFooter.tsx
/**
 * Chi Sublime â€” PublicFooter
 * ============================================================
 *
 * Estrutura de 4 colunas mantida; refinamentos:
 *  - Marca sem itÃ¡lico (coerente com navbar)
 *  - "Reservar Online" agora aponta para /marcacoes (era #contact)
 *  - Socials quadrados de cantos retos (linguagem do site)
 */

import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';

const NAV_LINKS = [
  { label: 'InÃ­cio', href: '#home' },
  { label: 'ServiÃ§os', href: '#services' },
  { label: 'Equipa', href: '#team' },
  { label: 'Galeria', href: '#gallery' },
  { label: 'Contacto', href: '#contact' },
];

const BOOKING_LINKS = [
  { label: 'MarcaÃ§Ãµes Online', href: '/marcacoes' },
  { label: 'A Minha Conta', href: '/conta' },
  { label: 'PolÃ­tica de Cancelamento', href: '/cancelamento' },
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
        {/* Grid principal â€” 4 colunas em desktop */}
        <div className="mb-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Coluna 1 â€” Marca + Socials
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
              Um refÃºgio sensorial em Cascais.
            </p>

            {/* Socials â€” quadrados retos */}
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

          {/* Coluna 2 â€” NavegaÃ§Ã£o */}
          <div>
            <h6 className="text-chi-green-deep mb-6 text-xs font-semibold tracking-[0.25em] uppercase">
              NavegaÃ§Ã£o
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

          {/* Coluna 3 â€” Reservas */}
          <div>
            <h6 className="text-chi-green-deep mb-6 text-xs font-semibold tracking-[0.25em] uppercase">
              MarcaÃ§Ãµes
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

          {/* Coluna 4 â€” Legal */}
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
          <span>Â© {currentYear} Chi Sublime Â· Todos os direitos reservados</span>
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
