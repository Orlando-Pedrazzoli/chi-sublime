// 📄 src/app/admin/layout.tsx
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { AdminShell } from '@/components/admin/layout/AdminShell';

/**
 * Layout das páginas de administração.
 *
 * Server Component fino: a moldura (sidebar, topbar, barra inferior
 * mobile) é o <AdminShell /> — client component porque depende da
 * sessão e do pathname. Fica aqui só o que tem de ser exportado de
 * um Server Component: o `viewport`.
 *
 * viewport-fit=cover (só no admin — junta-se ao viewport do layout
 * raiz): deixa a app ocupar o ecrã inteiro do telemóvel e ativa os
 * `env(safe-area-inset-*)`, para a barra inferior não ficar por baixo
 * da barra de gesto do iPhone nem a topbar por baixo do notch.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
