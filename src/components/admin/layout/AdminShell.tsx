// 📄 src/components/admin/layout/AdminShell.tsx
'use client';

/**
 * Chi Sublime — AdminShell (moldura do painel admin)
 * ============================================================
 *
 *  Desktop (≥ lg)                 Mobile / tablet (< lg) — tipo app
 *  ┌────────┬──────────────┐      ┌──────────────────────┐
 *  │        │ Topbar       │      │ Topbar compacta      │
 *  │ Side-  ├──────────────┤      ├──────────────────────┤
 *  │ bar    │ conteúdo     │      │ conteúdo (scroll)    │
 *  │        │              │      ├──────────────────────┤
 *  └────────┴──────────────┘      │ Barra de separadores │
 *                                 └──────────────────────┘
 *
 * Notas:
 *   - /admin/login NÃO usa a moldura (escapa via condição abaixo).
 *   - Protecção real é feita no proxy.ts + em cada página.
 *   - O scroll é o do documento (não um contentor interno): é o que
 *     mantém o comportamento nativo do browser em mobile (recolher a
 *     barra de endereço, "puxar para atualizar", tocar no topo).
 *   - Espaçamentos e safe-areas da moldura: classes .admin-* em
 *     src/app/globals.css.
 */

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminBottomNav } from './AdminBottomNav';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

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
    <div className="admin-shell">
      <AdminSidebar user={user} />

      <div className="lg:pl-[260px]">
        <AdminTopbar user={user} />
        <main className="admin-main">{children}</main>
      </div>

      <AdminBottomNav user={user} />
    </div>
  );
}
