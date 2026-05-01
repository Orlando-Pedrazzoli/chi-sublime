'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, Plus, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

type AdminTopbarProps = {
  user: {
    name: string;
    email: string;
  };
  onMobileMenuClick: () => void;
};

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/reservas': 'Reservas',
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

export function AdminTopbar({ user, onMobileMenuClick }: AdminTopbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);
  const firstName = user.name.split(/\s+/)[0];

  async function handleLogout() {
    await signOut({ redirect: false });
    window.location.href = '/';
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b px-4 lg:px-8"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.08)',
      }}
    >
      {/* Left: burger (mobile) + título */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuClick}
          aria-label="Abrir menu"
          className="rounded-md p-2 transition-colors hover:bg-gray-100 lg:hidden"
          style={{ color: '#1F3D2E' }}
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="font-serif text-xl leading-none sm:text-2xl" style={{ color: '#1A1A1A' }}>
            {pageTitle}
          </h1>
          <p
            className="mt-1 hidden text-[10px] tracking-[0.22em] uppercase sm:block"
            style={{ color: '#5A5A5A' }}
          >
            {formatToday()}
          </p>
        </div>
      </div>

      {/* Right: acções */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botão Nova Reserva */}
        <Link
          href="/admin/reservas?new=1"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] sm:px-4 sm:py-2.5"
          style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Nova reserva</span>
          <span className="sm:hidden">Nova</span>
        </Link>

        {/* Avatar dropdown */}
        <div className="relative">
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
                  <p className="mt-0.5 truncate font-serif text-base" style={{ color: '#1A1A1A' }}>
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
