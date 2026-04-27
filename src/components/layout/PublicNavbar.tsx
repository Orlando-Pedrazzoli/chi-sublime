'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

const NAV_LINKS = [
  { label: 'Início', href: '#home' },
  { label: 'Serviços', href: '#services' },
  { label: 'Equipa', href: '#team' },
  { label: 'Galeria', href: '#gallery' },
  { label: 'Contacto', href: '#contact' },
];

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          {/* Logo */}
          <Link
            href="#home"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group hover:text-chi-gold relative text-xs tracking-[0.18em] uppercase transition-colors"
                  style={{
                    color: '#FAF7F2',
                    textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                  }}
                >
                  {link.label}
                  <span className="bg-chi-gold absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="#contact"
              className="bg-chi-gold text-chi-green-deep hover:bg-chi-gold-soft px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
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
        <div className="flex h-full flex-col items-center justify-center gap-8 px-8">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'text-chi-cream hover:text-chi-gold font-serif text-3xl transition-all',
                mobileOpen && 'animate-fade-up',
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setMobileOpen(false)}
            className="bg-chi-gold text-chi-green-deep mt-6 px-8 py-4 text-sm font-semibold tracking-[0.22em] uppercase"
          >
            Reservar
          </Link>
        </div>
      </div>
    </>
  );
}
