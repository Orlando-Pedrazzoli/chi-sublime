// 📄 src/components/layout/NavLinks.tsx
/**
 * Chi Sublime — NavLinks (Client)
 * ============================================================
 *
 * Lógica intocada (sessão, dropdowns, scroll, mobile).
 * Refinamento visual: CTA de cantos retos sem glow/translate,
 * dropdowns sem gradientes decorativos, chevrons em vez de "▾".
 * Cores críticas em inline style (regra Tailwind v4 + Next 16).
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/cn';
import { LangSwitcher } from './LangSwitcher';

export type NavCategory = {
  slug: string;
  title: string;
};

export type NavSession = {
  name: string;
  role: 'client' | 'admin';
};

type NavLinksProps = {
  categories: NavCategory[];
  session: NavSession | null;
};

type NavItem = {
  /** chave em messages/{locale}.json → nav.* */
  labelKey: 'home' | 'services' | 'team' | 'gallery' | 'contact';
  anchor: string;
  hasDropdown?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'home', anchor: '#home' },
  { labelKey: 'services', anchor: '#services', hasDropdown: true },
  { labelKey: 'team', anchor: '#team' },
  { labelKey: 'gallery', anchor: '#gallery' },
  { labelKey: 'contact', anchor: '#contact' },
];

export function NavLinks({ categories, session }: NavLinksProps) {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const pathname = usePathname();
  const isHomepage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const getHref = (anchor: string) => {
    if (isHomepage) return anchor;
    return `/${anchor}`;
  };

  const firstName = session?.name.split(/\s+/)[0] ?? '';

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-chi-green-deep/95 border-chi-gold/10 border-b py-4 backdrop-blur-xl'
            : 'from-chi-green-darker/80 via-chi-green-darker/40 bg-gradient-to-b to-transparent py-6',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          {/* Logo — logo_new.png contém a marca completa
              (lótus + CHI + Sublime); sem texto ao lado */}
          <Link href="/" className="flex items-center transition hover:opacity-80">
            <Image
              src="/images/logo_new.png"
              alt="Chi Sublime"
              width={81}
              height={60}
              className="h-12 w-auto md:h-14"
              priority
            />
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
                  className="group hover:text-chi-gold relative inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase transition-colors"
                  style={{
                    color: '#FAF7F2',
                    textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                  }}
                >
                  {t(item.labelKey)}
                  {item.hasDropdown && (
                    <ChevronDown
                      size={12}
                      strokeWidth={1.5}
                      className={cn(
                        'transition-transform duration-200',
                        servicesDropdownOpen && 'rotate-180',
                      )}
                    />
                  )}
                  <span className="bg-chi-gold absolute -bottom-1.5 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
                </Link>

                {item.hasDropdown && (
                  <div
                    className={cn(
                      'absolute top-full left-1/2 z-30 w-64 -translate-x-1/2 pt-4 transition-all duration-200',
                      servicesDropdownOpen
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-2 opacity-0',
                    )}
                  >
                    <div className="bg-chi-green-deep/95 border-chi-gold/20 overflow-hidden border backdrop-blur-xl">
                      <ul className="py-2">
                        {categories.map((cat) => (
                          <li key={cat.slug}>
                            <Link
                              href={`/servicos/${cat.slug}`}
                              className="group flex items-center justify-between px-5 py-3 font-serif text-base transition-colors duration-300"
                              style={{ color: '#FAF7F2' }}
                            >
                              <span className="group-hover:text-chi-gold transition-colors duration-300">
                                {cat.title}
                              </span>
                              <span className="text-chi-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                                →
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="border-chi-gold/15 border-t">
                        <Link
                          href={getHref('#services')}
                          className="hover:text-chi-gold block px-5 py-3 text-center text-[10px] tracking-[0.25em] uppercase transition-colors duration-300"
                          style={{ color: '#D4AF6E' }}
                        >
                          Ver todos os serviços
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Right side: Account + CTA */}
          <div className="hidden items-center gap-6 lg:flex">
            {/* Toggle de idioma PT | EN */}
            <LangSwitcher variant="desktop" scrolled={scrolled} />

            {/* Estado: NÃO LOGADO */}
            {!session && (
              <Link
                href="/entrar"
                className="hover:text-chi-gold flex items-center gap-2 text-xs tracking-[0.18em] uppercase transition-colors"
                style={{
                  color: '#FAF7F2',
                  textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                }}
              >
                <User size={14} strokeWidth={1.5} />
                {t('login')}
              </Link>
            )}

            {/* Estado: ADMIN */}
            {session?.role === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="hover:text-chi-gold flex items-center gap-2 text-xs tracking-[0.18em] uppercase transition-colors"
                style={{
                  color: '#FAF7F2',
                  textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                }}
              >
                <User size={14} strokeWidth={1.5} />
                {t('adminPanel')}
              </Link>
            )}

            {/* Estado: CLIENTE */}
            {session?.role === 'client' && (
              <div
                className="relative"
                onMouseEnter={() => setAccountDropdownOpen(true)}
                onMouseLeave={() => setAccountDropdownOpen(false)}
              >
                <button
                  type="button"
                  className="hover:text-chi-gold flex items-center gap-2 transition-colors"
                  style={{
                    color: '#FAF7F2',
                    textShadow: scrolled ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
                  }}
                >
                  <User size={14} strokeWidth={1.5} />
                  <span className="text-sm font-normal" style={{ letterSpacing: '0.03em' }}>
                    {firstName}
                  </span>
                  <ChevronDown
                    size={12}
                    strokeWidth={1.5}
                    className={cn(
                      'transition-transform duration-200',
                      accountDropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'absolute top-full right-0 z-30 w-64 pt-4 transition-all duration-200',
                    accountDropdownOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-2 opacity-0',
                  )}
                >
                  <div className="bg-chi-green-deep/95 border-chi-gold/20 overflow-hidden border backdrop-blur-xl">
                    {/* User header */}
                    <div
                      className="px-5 py-3"
                      style={{ borderBottom: '1px solid rgba(212,175,110,0.15)' }}
                    >
                      <p
                        className="text-[10px] tracking-[0.22em] uppercase"
                        style={{ color: '#B8924A' }}
                      >
                        Sessão iniciada
                      </p>
                      <p
                        className="mt-0.5 truncate font-serif text-base"
                        style={{ color: '#FAF7F2' }}
                      >
                        {session.name}
                      </p>
                    </div>

                    {/* Menu links */}
                    <ul className="py-2">
                      <li>
                        <Link
                          href="/conta"
                          className="group flex items-center justify-between px-5 py-2.5 text-sm transition-colors duration-300"
                          style={{ color: '#FAF7F2' }}
                        >
                          <span className="group-hover:text-chi-gold transition-colors">
                            {t('myAccount')}
                          </span>
                          <span className="text-chi-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                            →
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/conta/reservas"
                          className="group flex items-center justify-between px-5 py-2.5 text-sm transition-colors duration-300"
                          style={{ color: '#FAF7F2' }}
                        >
                          <span className="group-hover:text-chi-gold transition-colors">
                            {t('myBookings')}
                          </span>
                          <span className="text-chi-gold opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                            →
                          </span>
                        </Link>
                      </li>
                    </ul>

                    {/* Logout */}
                    <div className="border-chi-gold/15 border-t p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-300 hover:bg-white/5"
                        style={{ color: 'rgba(250,247,242,0.7)' }}
                      >
                        <LogOut size={14} strokeWidth={1.5} />
                        <span className="group-hover:text-chi-gold transition-colors">
                          {t('signOut')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Reservar — cantos retos, sem glow nem translate */}
            <Link
              href="/reservar"
              className="bg-chi-gold hover:bg-chi-gold-soft px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
              style={{ color: '#1F3D2E' }}
            >
              {t('book')}
            </Link>
          </div>

          {/* Burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1.5 p-2 lg:hidden"
            aria-label={t('menu')}
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

      {/* Mobile menu */}
      <div
        className={cn(
          'bg-chi-green-deep fixed inset-0 z-40 transition-all duration-500 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-8 py-24">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.anchor}
              href={getHref(item.anchor)}
              onClick={() => setMobileOpen(false)}
              className="text-chi-cream hover:text-chi-gold font-serif text-3xl"
            >
              {t(item.labelKey)}
            </Link>
          ))}

          {/* Toggle de idioma PT | EN */}
          <LangSwitcher variant="mobile" />

          {/* Account section */}
          <div className="bg-chi-gold/30 my-4 h-px w-24" />

          {!session && (
            <Link
              href="/entrar"
              onClick={() => setMobileOpen(false)}
              className="text-chi-cream hover:text-chi-gold flex items-center gap-2 text-lg tracking-[0.18em] uppercase"
            >
              <User size={18} strokeWidth={1.5} />
              {t('login')}
            </Link>
          )}

          {session?.role === 'admin' && (
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              className="text-chi-cream hover:text-chi-gold flex items-center gap-2 text-lg tracking-[0.18em] uppercase"
            >
              <User size={18} strokeWidth={1.5} />
              {t('adminPanel')}
            </Link>
          )}

          {session?.role === 'client' && (
            <>
              <Link
                href="/conta"
                onClick={() => setMobileOpen(false)}
                className="text-chi-cream hover:text-chi-gold flex items-center gap-2 font-serif text-2xl"
              >
                <User size={20} strokeWidth={1.5} />
                {t('greeting', { name: firstName })}
              </Link>
              <Link
                href="/conta/reservas"
                onClick={() => setMobileOpen(false)}
                className="text-chi-cream/80 hover:text-chi-gold text-sm tracking-[0.18em] uppercase"
              >
                {t('myBookings')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="text-chi-cream/60 hover:text-chi-gold flex items-center gap-2 text-xs tracking-[0.18em] uppercase"
              >
                <LogOut size={14} strokeWidth={1.5} />
                {t('signOut')}
              </button>
            </>
          )}

          <Link
            href="/reservar"
            onClick={() => setMobileOpen(false)}
            className="bg-chi-gold mt-6 px-8 py-4 text-sm font-semibold tracking-[0.22em] uppercase"
            style={{ color: '#1F3D2E' }}
          >
            {t('book')}
          </Link>
        </div>
      </div>
    </>
  );
}
