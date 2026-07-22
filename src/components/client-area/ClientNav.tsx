'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, User as UserIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/conta', label: 'Resumo', icon: LayoutDashboard },
  { href: '/conta/reservas', label: 'Marcações', icon: Calendar },
  { href: '/conta/perfil', label: 'Perfil', icon: UserIcon },
  { href: '/conta/seguranca', label: 'Segurança', icon: Shield },
];

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="mb-3 px-4 text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
        Menu
      </p>

      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/conta' ? pathname === '/conta' : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-all',
              !isActive && 'hover:bg-white',
            )}
            style={{
              backgroundColor: isActive ? '#1F3D2E' : 'transparent',
              color: isActive ? '#FAF7F2' : '#1A1A1A',
            }}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
            {isActive && (
              <span className="ml-auto" style={{ color: '#D4AF6E' }}>
                →
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
