// 📄 src/components/admin/layout/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ADMIN_NAV_ITEMS, ADMIN_SHORTCUTS, getInitials, isAdminNavActive } from './admin-nav';

/**
 * Sidebar do painel admin — SÓ desktop (≥ lg).
 *
 * Em mobile/tablet a navegação é a barra inferior tipo app
 * (<AdminBottomNav />), por isso a sidebar nem sequer é renderizada
 * abaixo de `lg` (`hidden`) — deixou de existir o menu hambúrguer.
 * Os itens vêm de ./admin-nav (fonte única para sidebar e barra).
 */

type AdminSidebarProps = {
  user: {
    name: string;
    email: string;
  };
};

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = getInitials(user.name);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col lg:flex"
      style={{ backgroundColor: '#1F3D2E' }}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex flex-col">
            <span
              className="font-serif text-lg leading-none tracking-wider italic"
              style={{ color: '#FAF7F2' }}
            >
              Chi <span style={{ color: '#D4AF6E' }}>Sublime</span>
            </span>
            <span
              className="mt-1 text-[9px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(212,175,110,0.8)' }}
            >
              Painel admin
            </span>
          </div>
        </Link>
      </div>

      {/* Top accent line */}
      <div
        className="mx-6 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(212,175,110,0.4), transparent)',
        }}
      />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <p
          className="mb-2 px-3 text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'rgba(212,175,110,0.7)' }}
        >
          Menu
        </p>
        <ul className="space-y-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = isAdminNavActive(item.href, pathname);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all',
                    !isActive && 'hover:bg-white/5',
                  )}
                  style={{
                    backgroundColor: isActive ? 'rgba(212,175,110,0.15)' : 'transparent',
                    color: isActive ? '#D4AF6E' : 'rgba(250,247,242,0.85)',
                  }}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                  {isActive && <ChevronRight size={14} strokeWidth={1.5} className="ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Atalhos externos — site público e caixa de email */}
        <p
          className="mt-7 mb-2 px-3 text-[10px] tracking-[0.22em] uppercase"
          style={{ color: 'rgba(212,175,110,0.7)' }}
        >
          Atalhos
        </p>
        <ul className="space-y-0.5">
          {ADMIN_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <li key={shortcut.href}>
                <a
                  href={shortcut.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all hover:bg-white/5"
                  style={{ color: 'rgba(250,247,242,0.85)' }}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span>{shortcut.label}</span>
                  <span
                    className="ml-auto text-[10px]"
                    style={{ color: 'rgba(250,247,242,0.4)' }}
                    aria-hidden
                  >
                    ↗
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom divider */}
      <div
        className="mx-6 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(212,175,110,0.3), transparent)',
        }}
      />

      {/* User footer */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              backgroundColor: '#D4AF6E',
              color: '#1F3D2E',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: '#FAF7F2' }}>
              {user.name}
            </p>
            <p
              className="truncate text-[10px] tracking-wide uppercase"
              style={{ color: 'rgba(250,247,242,0.5)' }}
            >
              Administrador
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
