'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export type NavCategory = {
  slug: string;
  title: string;
};

type NavLinksProps = {
  categories: NavCategory[];
};

type NavItem = {
  label: string;
  anchor: string;
  hasDropdown?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', anchor: '#home' },
  { label: 'Serviços', anchor: '#services', hasDropdown: true },
  { label: 'Equipa', anchor: '#team' },
  { label: 'Galeria', anchor: '#gallery' },
  { label: 'Contacto', anchor: '#contact' },
];

export function NavLinks({ categories }: NavLinksProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar mobile menu ao mudar de página
  useEffect(() => {
    setMobileOpen(false);
    setMobileServicesOpen(false);
  }, [pathname]);

  /**
   * Constrói href inteligente:
   * - Se estamos na homepage → usa âncora (#services)
   * - Se estamos noutra página → volta à homepage com âncora (/#services)
   */
  const getHref = (anchor: string) => {
    if (isHomepage) return anchor;
    return `/${anchor}`;
  };

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-400',
          scrolled
            ? 'bg-chi-green-deep/95 border-chi-gold/15 border-b py-4 backdrop-blur-md'
            : 'from-chi-green-darker/90 via-chi-green-darker/50 bg-gradient-to-b to-transparent py-6',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          {/* Logo — sempre vai para a homepage */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image
              src="/images/logo.png"
              alt="Chi Sublime"
              width={48}
              height={48}
              className="h-10 w-10 md:h-12 md:w-12"
              priority
            />
            <span
              className="font-serif text-xl tracking-wider italic md:text-2xl"
              style={{
                color: '#FAF7F2',
                textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              Chi <span style={{ color: '#D4AF6E' }}>Sublime</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-10 lg:flex">
            {NAV_ITEMS.map((item) => (
              <li
                key={item.anchor}
                className="relative"
                onMouseEnter={() => item.hasDropdown && setServicesDropdownOpen(true)}
                onMouseLeave={() => item.hasDropdown && setServicesDropdownOpen(false)}
              >
                <Link
                  href={getHref(item.anchor)}
                  className="group hover:text-chi-gold relative text-xs tracking-[0.18em] uppercase transition-colors"
                  style={{
                    color: '#FAF7F2',
                    textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                  }}
                >
                  {item.label}
                  {item.hasDropdown && (
                    <span className="ml-1.5 inline-block translate-y-[-1px] text-[8px]">▾</span>
                  )}
                  <span className="bg-chi-gold absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
                </Link>

                {/* Dropdown — apenas para Serviços */}
                {item.hasDropdown && (
                  <div
                    className={cn(
                      'absolute top-full left-1/2 z-30 w-64 -translate-x-1/2 pt-4 transition-all duration-200',
                      servicesDropdownOpen
                        ? 'pointer-events-auto translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-2 opacity-0',
                    )}
                  >
                    <div
                      className="border-chi-gold/30 shadow-strong overflow-hidden border"
                      style={{ backgroundColor: '#1F3D2E' }}
                    >
                      {/* Linha dourada decorativa */}
                      <div className="via-chi-gold/60 h-px w-full bg-gradient-to-r from-transparent to-transparent" />

                      <ul className="py-2">
                        {categories.map((cat) => (
                          <li key={cat.slug}>
                            <Link
                              href={`/servicos/${cat.slug}`}
                              className="group hover:bg-chi-gold/10 flex items-center justify-between px-5 py-3 font-serif text-base transition-colors"
                              style={{ color: '#FAF7F2' }}
                            >
                              <span>{cat.title}</span>
                              <span className="text-chi-gold opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                                →
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>

                      <div className="via-chi-gold/30 h-px w-full bg-gradient-to-r from-transparent to-transparent" />

                      <Link
                        href={getHref('#services')}
                        className="block px-5 py-3 text-center text-[10px] tracking-[0.25em] uppercase transition-colors hover:opacity-80"
                        style={{ color: '#D4AF6E' }}
                      >
                        Ver todos os serviços
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* CTA Reservar */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href={getHref('#contact')}
              className="bg-chi-gold text-chi-green-deep hover:bg-chi-gold-soft hover:text-chi-green-darker px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
            >
              Reservar
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1.5 p-2 lg:hidden"
            aria-label="Menu"
          >
            <span
              className={cn(
                'bg-chi-cream h-px w-6 transition-transform duration-300',
                mobileOpen && 'translate-y-2 rotate-45',
              )}
            />
            <span
              className={cn(
                'bg-chi-cream h-px w-6 transition-opacity duration-300',
                mobileOpen && 'opacity-0',
              )}
            />
            <span
              className={cn(
                'bg-chi-cream h-px w-6 transition-transform duration-300',
                mobileOpen && '-translate-y-2 -rotate-45',
              )}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          'bg-chi-green-deep fixed inset-0 z-40 transition-all duration-500 lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-8 py-24">
          {NAV_ITEMS.map((item, i) => (
            <div key={item.anchor} className="text-center">
              {item.hasDropdown ? (
                <>
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className={cn(
                      'text-chi-cream hover:text-chi-gold flex items-center gap-3 font-serif text-3xl transition-all',
                      mobileOpen && 'animate-fade-up',
                    )}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {item.label}
                    <span
                      className={cn(
                        'text-base transition-transform duration-300',
                        mobileServicesOpen && 'rotate-180',
                      )}
                    >
                      ▾
                    </span>
                  </button>

                  {/* Sub-lista de categorias */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-300',
                      mobileServicesOpen ? 'mt-4 max-h-96' : 'max-h-0',
                    )}
                  >
                    <ul className="space-y-3 pt-2">
                      {categories.map((cat) => (
                        <li key={cat.slug}>
                          <Link
                            href={`/servicos/${cat.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="text-chi-gold/90 hover:text-chi-gold block font-serif text-lg italic"
                          >
                            {cat.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <Link
                  href={getHref(item.anchor)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'text-chi-cream hover:text-chi-gold font-serif text-3xl transition-all',
                    mobileOpen && 'animate-fade-up',
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}

          <Link
            href={getHref('#contact')}
            onClick={() => setMobileOpen(false)}
            className="bg-chi-gold text-chi-green-deep mt-4 px-8 py-4 text-sm font-semibold tracking-[0.22em] uppercase"
          >
            Reservar
          </Link>
        </div>
      </div>
    </>
  );
}
