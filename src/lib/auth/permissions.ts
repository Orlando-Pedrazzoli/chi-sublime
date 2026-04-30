import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin';
  clientId?: string;
};

// ============================================================================
// Helpers que NÃO redirecionam (devolvem null/boolean)
// ============================================================================

/**
 * Devolve o utilizador da sessão actual ou null se não autenticado.
 * Útil em layouts que renderizam tanto público como autenticado.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function hasRole(role: 'client' | 'admin'): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

export async function isClient(): Promise<boolean> {
  return hasRole('client');
}

// ============================================================================
// Helpers que REDIRECIONAM (usar em Server Components/Actions protegidos)
// ============================================================================

/**
 * Garante que existe sessão. Caso contrário redireciona para /entrar.
 * Devolve sempre um SessionUser válido.
 *
 * @param redirectTo URL para onde voltar após login (default: página actual)
 */
export async function requireAuth(redirectTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/entrar${target}`);
  }
  return user;
}

/**
 * Garante que o utilizador tem o role indicado.
 * Sem sessão → redirect para /entrar
 * Sessão mas role errado → redirect para /entrar (não revela existência da rota)
 */
export async function requireRole(
  role: 'client' | 'admin',
  redirectTo?: string,
): Promise<SessionUser> {
  const user = await requireAuth(redirectTo);

  if (user.role !== role) {
    // Admin a tentar aceder a rota de cliente: redirect para /admin/dashboard
    if (user.role === 'admin' && role === 'client') {
      redirect('/admin/dashboard');
    }
    // Cliente a tentar aceder a rota admin: comportamento como não autenticado
    redirect('/entrar');
  }

  return user;
}

/**
 * Atalho semântico para rotas admin.
 */
export async function requireAdmin(redirectTo?: string): Promise<SessionUser> {
  return requireRole('admin', redirectTo);
}

/**
 * Atalho semântico para rotas de cliente autenticado.
 */
export async function requireClient(redirectTo?: string): Promise<SessionUser> {
  return requireRole('client', redirectTo);
}
