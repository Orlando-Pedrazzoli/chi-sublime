// 📄 src/components/admin/layout/admin-nav.ts
/**
 * Chi Sublime — Navegação do painel admin (fonte única)
 * ============================================================
 *
 * A sidebar (desktop) e a barra inferior (mobile) leem a mesma lista,
 * para nunca ficarem dessincronizadas:
 *
 *   - Desktop: todos os itens na sidebar, pela ordem abaixo.
 *   - Mobile:  os itens com `tab: true` são os separadores da barra
 *              inferior; os restantes aparecem na folha "Mais".
 */

import {
  BarChart3,
  Calendar,
  Globe,
  Images,
  LayoutDashboard,
  Mail,
  Scissors,
  Settings,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  /** Nome da secção (sidebar, folha "Mais", título da página) */
  label: string;
  /** Nome curto no separador da barra inferior (default: `label`) */
  tabLabel?: string;
  icon: LucideIcon;
  /** true → separador fixo na barra inferior em mobile */
  tab?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    tabLabel: 'Início',
    icon: LayoutDashboard,
    tab: true,
  },
  { href: '/admin/marcacoes', label: 'Marcações', icon: Calendar, tab: true },
  { href: '/admin/clientes', label: 'Clientes', icon: Users, tab: true },
  { href: '/admin/receitas', label: 'Receitas', icon: TrendingUp, tab: true },
  { href: '/admin/despesas', label: 'Despesas', icon: TrendingDown },
  { href: '/admin/servicos', label: 'Serviços', icon: Scissors },
  { href: '/admin/equipa', label: 'Equipa', icon: UserCog },
  { href: '/admin/galeria', label: 'Galeria', icon: Images },
  { href: '/admin/relatorios/financeiro', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/definicoes', label: 'Definições', icon: Settings },
];

export type AdminShortcut = { href: string; label: string; icon: LucideIcon };

/** Atalhos externos — abrem num separador novo */
export const ADMIN_SHORTCUTS: AdminShortcut[] = [
  { href: 'https://www.chisublime.pt', label: 'Ver site', icon: Globe },
  { href: 'https://mail.hostinger.com/mailboxes/INBOX', label: 'Email Chi Sublime', icon: Mail },
];

/** Secção ativa: a dashboard só com match exato, as restantes por prefixo. */
export function isAdminNavActive(href: string, pathname: string): boolean {
  if (href === '/admin/dashboard') return pathname === '/admin/dashboard';
  // Relatórios: o link aponta para /financeiro mas a secção é /admin/relatorios/*
  if (href.startsWith('/admin/relatorios')) return pathname.startsWith('/admin/relatorios');
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Iniciais para o avatar ("Jean Pierre" → "JP") */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}
