import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s · Chi Sublime Admin',
    default: 'Painel · Chi Sublime',
  },
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Layout das páginas de administração.
 *
 * Sprint 4 (actual):
 *   - Apenas isola o admin do site público (sem navbar/footer públicos).
 *   - Background uniforme cream da paleta.
 *
 * Sprint 5 (futuro):
 *   - Adicionar AdminSidebar + AdminTopbar + AdminNotifications + QuickActionsFab.
 *   - Os componentes já estão scaffolded em src/components/admin/layout/.
 *
 * Nota sobre protecção:
 *   - Não usar requireAdmin() aqui porque /admin/login também usa este layout.
 *   - Protecção feita em (a) middleware proxy.ts, (b) cada página individual.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF7F2' }}>
      {children}
    </div>
  );
}
