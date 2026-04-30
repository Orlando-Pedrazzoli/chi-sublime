import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * Rota /admin (sem subpath).
 *
 * Redirect inteligente baseado no estado da sessão:
 *  - Admin logado → /admin/dashboard
 *  - Cliente logado → /conta (não tem permissão admin)
 *  - Sem sessão → /admin/login
 *
 * Garante que o utilizador nunca vê 404 ao escrever apenas "/admin" no browser.
 */
export default async function AdminIndexPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/admin/login');
  }

  if (session.user.role === 'admin') {
    redirect('/admin/dashboard');
  }

  // Cliente logado a tentar aceder /admin
  redirect('/conta');
}
