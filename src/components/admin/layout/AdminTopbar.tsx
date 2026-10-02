// 📄 src/components/admin/layout/AdminTopbar.tsx
'use client';

/**
 * Barra de topo do painel admin.
 *
 *  - Mobile/tablet (< lg): "app bar" compacta de 56px — marca na
 *    dashboard, título nas restantes páginas, e o botão "Nova"
 *    (nova marcação) sempre à mão. Sem hambúrguer nem avatar: a
 *    navegação e a conta vivem na barra inferior (<AdminBottomNav />).
 *  - Desktop (≥ lg): título + data, "Nova marcação" e menu da conta.
 *
 * `padding-top: env(safe-area-inset-top)` — com viewport-fit=cover
 * a barra não fica por baixo do notch / barra de estado (PWA).
 */

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Plus, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

type AdminTopbarProps = {
  user: {
    name: string;
    email: string;
  };
};

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/marcacoes': 'Marcações',
  '/admin/clientes': 'Clientes',
  '/admin/receitas': 'Receitas',
  '/admin/despesas': 'Despesas',
  '/admin/servicos': 'Serviços',
  '/admin/equipa': 'Equipa',
  '/admin/horarios': 'Horários',
  '/admin/relatorios': 'Relatórios',
  '/admin/relatorios/financeiro': 'Relatório Financeiro',
  '/admin/relatorios/iva': 'IVA',
  '/admin/relatorios/staff': 'Performance Equipa',
  '/admin/relatorios/clientes': 'Relatório Clientes',
  '/admin/caixa': 'Caixa',
  '/admin/conteudo': 'Conteúdo do Site',
  '/admin/galeria': 'Galeria',
  '/admin/definicoes': 'Definições',
};

function getPageTitle(pathname: string): string {
  // Match exacto primeiro
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match parcial (mais longo primeiro)
  const matches = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length);
  if (matches[0]) return PAGE_TITLES[matches[0]];
  return 'Painel';
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);
  const isDashboard = pathname === '/admin/dashboard';
  const firstName = user.name.split(/\s+/)[0];

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }

  return (
    <header
      className="sticky top-0 z-30 border-b print:hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.08)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="admin-topbar-row flex h-14 items-center justify-between lg:h-[68px]">
        {/* Left: marca (dashboard em mobile) ou título da página */}
        <div className="min-w-0">
          {isDashboard ? (
            <Link
              href="/admin/dashboard"
              aria-label="Chi Sublime — Dashboard"
              className="font-serif italic lg:hidden"
              style={{ fontSize: '22px', lineHeight: 1, letterSpacing: '0.02em', color: '#1F3D2E' }}
            >
              Chi <span style={{ color: '#B8924A' }}>Sublime</span>
            </Link>
          ) : null}
          <h1
            className={`truncate font-serif text-xl leading-none sm:text-2xl ${
              isDashboard ? 'hidden lg:block' : ''
            }`}
            style={{ color: '#1A1A1A' }}
          >
            {pageTitle}
          </h1>
          <p
            className="mt-1 hidden text-[10px] tracking-[0.22em] uppercase lg:block"
            style={{ color: '#5A5A5A' }}
          >
            {formatToday()}
          </p>
        </div>

        {/* Right: acções */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Botão Nova Marcação — pílula em mobile, botão clássico em desktop */}
          <Link
            href="/admin/marcacoes?new=1"
            aria-label="Nova marcação"
            className="admin-new-btn admin-press inline-flex items-center font-semibold transition-all lg:hover:-translate-y-[1px]"
            style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
          >
            <Plus size={15} strokeWidth={2.25} />
            <span className="hidden lg:inline">Nova marcação</span>
            <span className="lg:hidden">Nova</span>
          </Link>

          {/* Avatar dropdown — só desktop (em mobile a conta está em "Mais") */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-gray-100"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
              >
                {firstName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium md:block" style={{ color: '#1A1A1A' }}>
                {firstName}
              </span>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                style={{ color: '#5A5A5A' }}
              />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  className="absolute top-full right-0 z-20 mt-2 w-60 overflow-hidden rounded-md border shadow-lg"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: 'rgba(31,61,46,0.1)',
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: '1px solid rgba(31,61,46,0.08)' }}
                  >
                    <p
                      className="text-[10px] tracking-[0.22em] uppercase"
                      style={{ color: '#B8924A' }}
                    >
                      Sessão iniciada
                    </p>
                    <p
                      className="mt-0.5 truncate font-serif text-base"
                      style={{ color: '#1A1A1A' }}
                    >
                      {user.name}
                    </p>
                    <p className="truncate text-xs" style={{ color: '#5A5A5A' }}>
                      {user.email}
                    </p>
                  </div>

                  <div className="p-1">
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-gray-100"
                      style={{ color: '#1A1A1A' }}
                    >
                      <UserIcon size={14} strokeWidth={1.5} style={{ color: '#D4AF6E' }} />
                      Ir ao dashboard
                    </Link>
                  </div>

                  <div className="p-1" style={{ borderTop: '1px solid rgba(31,61,46,0.08)' }}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-red-50"
                      style={{ color: '#B23C3C' }}
                    >
                      <LogOut size={14} strokeWidth={1.5} />
                      Terminar sessão
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function formatToday(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}
