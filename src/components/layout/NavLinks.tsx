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

  useEffect(() => {
    setMobileOpen(false);
    setMobileServicesOpen(false);
  }, [pathname]);

  const getHref = (anchor: string) => {
    if (isHomepage) return anchor;
    return `/${anchor}`;
  };

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-chi-green-deep/95 border-chi-gold/10 shadow-medium border-b py-4 backdrop-blur-xl'
            : 'from-chi-green-darker/90 via-chi-green-darker/60 bg-gradient-to-b to-transparent py-6',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
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
                textShadow: scrolled ? 'none' : '0 2px 10px rgba(0,0,0,0.6)',
              }}
            >
              Chi <span className="text-chi-gold">Sublime</span>
            </span>
          </Link>

          {/* Desktop */}
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
                  {item.hasDropdown && <span className="ml-1 text-[8px]">▾</span>}

                  <span className="bg-chi-gold absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
                </Link>

                {/* Dropdown */}
                {item.hasDropdown && (
                  <div
                    className={cn(
                      'absolute top-full left-1/2 z-30 w-64 -translate-x-1/2 pt-4 transition-all duration-200',
                      servicesDropdownOpen
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-2 opacity-0',
                    )}
                  >
                    <div className="bg-chi-green-deep/95 border-chi-gold/20 shadow-strong overflow-hidden rounded-md border backdrop-blur-xl">
                      {/* Linha topo */}
                      <div className="via-chi-gold/60 h-px bg-gradient-to-r from-transparent to-transparent" />

                      <ul className="py-2">
                        {categories.map((cat) => (
                          <li key={cat.slug}>
                            <Link
                              href={`/servicos/${cat.slug}`}
                              className="group flex items-center justify-between px-5 py-3 font-serif text-base transition-all duration-300"
                              style={{ color: '#FAF7F2' }}
                            >
                              {/* Texto */}
                              <span className="group-hover:text-chi-gold relative z-10 transition-colors duration-300">
                                {cat.title}
                              </span>

                              {/* Arrow */}
                              <span className="text-chi-gold transform opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                                →
                              </span>

                              {/* Hover background suave */}
                              <span className="from-chi-gold/10 via-chi-gold/5 absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>

                      {/* Divider */}
                      <div className="via-chi-gold/30 h-px bg-gradient-to-r from-transparent to-transparent" />

                      {/* Footer link */}
                      <Link
                        href={getHref('#services')}
                        className="block px-5 py-3 text-center text-[10px] tracking-[0.25em] uppercase transition-all duration-300"
                        style={{ color: '#D4AF6E' }}
                      >
                        <span className="relative inline-block">
                          Ver todos os serviços
                          <span className="bg-chi-gold absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="hidden lg:flex">
            <Link
              href="/reservar"
              className="bg-chi-gold text-chi-green-deep hover:bg-chi-gold-soft hover:text-chi-green-darker hover:shadow-gold rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[2px]"
            >
              Agendar
            </Link>
          </div>

          {/* Burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1.5 p-2 lg:hidden"
          >
            <span
              className={cn(
                'bg-chi-cream h-px w-6 transition',
                mobileOpen && 'translate-y-2 rotate-45',
              )}
            />
            <span className={cn('bg-chi-cream h-px w-6 transition', mobileOpen && 'opacity-0')} />
            <span
              className={cn(
                'bg-chi-cream h-px w-6 transition',
                mobileOpen && '-translate-y-2 -rotate-45',
              )}
            />
          </button>
        </div>
      </nav>

      {/* Mobile */}
      <div
        className={cn(
          'bg-chi-green-deep fixed inset-0 z-40 transition-all duration-500 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-6 px-8 py-24">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.anchor}
              href={getHref(item.anchor)}
              onClick={() => setMobileOpen(false)}
              className="text-chi-cream hover:text-chi-gold font-serif text-3xl"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/reservar"
            onClick={() => setMobileOpen(false)}
            className="bg-chi-gold text-chi-green-deep mt-6 px-8 py-4 text-sm font-semibold tracking-[0.22em] uppercase"
          >
            Agendar
          </Link>
        </div>
      </div>
    </>
  );
}
