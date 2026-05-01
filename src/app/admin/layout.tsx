'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopbar } from '@/components/admin/layout/AdminTopbar';
import { QuickActionsFab } from '@/components/admin/layout/QuickActionsFab';

/**
 * Layout das páginas de administração.
 *
 * Sprint 5: Sidebar + Topbar profissionais.
 *
 * Notas:
 *   - /admin/login NÃO usa este layout (escapa via condição abaixo).
 *   - Protecção real é feita em proxy.ts middleware + cada página.
 *   - Client component porque precisa de useState para mobile drawer.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Página de login não tem chrome admin
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Sem sessão (a redirecionar) — fallback minimalista
  if (!session?.user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: '#FAF7F2' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: '#1F3D2E', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#5A5A5A' }}>
            A verificar sessão...
          </p>
        </div>
      </div>
    );
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F2' }}>
      <AdminSidebar
        user={user}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-[260px]">
        <AdminTopbar user={user} onMobileMenuClick={() => setMobileSidebarOpen(true)} />

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <QuickActionsFab />
    </div>
  );
}
