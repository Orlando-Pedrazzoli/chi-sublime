'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Scissors,
  UserCog,
  BarChart3,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reservas', label: 'Reservas', icon: Calendar },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/receitas', label: 'Receitas', icon: TrendingUp },
  { href: '/admin/despesas', label: 'Despesas', icon: TrendingDown },
  { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { href: '/admin/equipa', label: 'Equipa', icon: UserCog },
  { href: '/admin/relatorios/financeiro', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/definicoes', label: 'Definições', icon: Settings },
];

type AdminSidebarProps = {
  user: {
    name: string;
    email: string;
  };
  isMobileOpen: boolean;
  onMobileClose: () => void;
};

export function AdminSidebar({ user, isMobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <>
      {/* Backdrop mobile */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ backgroundColor: '#1F3D2E' }}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 rounded-md p-2 transition-colors hover:bg-white/10 lg:hidden"
          style={{ color: '#FAF7F2' }}
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Image
              src="/images/logo.png"
              alt="Chi Sublime"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
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
            background:
              'linear-gradient(to right, transparent, rgba(212,175,110,0.4), transparent)',
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
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/admin/dashboard'
                  ? pathname === '/admin/dashboard'
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
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
        </nav>

        {/* Bottom divider */}
        <div
          className="mx-6 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(212,175,110,0.3), transparent)',
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
    </>
  );
}
