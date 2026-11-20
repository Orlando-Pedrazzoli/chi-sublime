// 📄 src/proxy.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// ============================================================================
// Definição de rotas
// ============================================================================

const PUBLIC_AUTH_PAGES = ['/entrar', '/registar', '/recuperar-password', '/redefinir-password'];
const ADMIN_LOGIN_PAGE = '/admin/login';

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN_PAGE;
}

function isClientRoute(pathname: string): boolean {
  return pathname.startsWith('/conta');
}

function isPublicAuthPage(pathname: string): boolean {
  return PUBLIC_AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ============================================================================
// Middleware
// ============================================================================

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // ──────────────────────────────────────────────────────────
  // 1. Rotas admin (excepto /admin/login)
  // ──────────────────────────────────────────────────────────
  if (isAdminRoute(pathname)) {
    if (!isLoggedIn) {
      const url = new URL(ADMIN_LOGIN_PAGE, nextUrl);
      // Preserva a query string (ex.: /conta/marcacoes?nova=CHI-…) para o
      // pós-login voltar exatamente ao mesmo sítio
      url.searchParams.set('redirect', pathname + nextUrl.search);
      return NextResponse.redirect(url);
    }
    if (role !== 'admin') {
      // Cliente a tentar aceder /admin/* → redirect para /entrar
      const url = new URL('/entrar', nextUrl);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────
  // 2. /admin/login — se já logado como admin, vai para dashboard
  // ──────────────────────────────────────────────────────────
  if (pathname === ADMIN_LOGIN_PAGE) {
    if (isLoggedIn && role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────
  // 3. Rotas /conta/* — exigem sessão
  // ──────────────────────────────────────────────────────────
  if (isClientRoute(pathname)) {
    if (!isLoggedIn) {
      const url = new URL('/entrar', nextUrl);
      // Preserva a query string (ex.: /conta/marcacoes?nova=CHI-…) para o
      // pós-login voltar exatamente ao mesmo sítio
      url.searchParams.set('redirect', pathname + nextUrl.search);
      return NextResponse.redirect(url);
    }
    // Admin não precisa de área cliente — redirect para admin
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────
  // 4. Páginas de auth (/entrar, /registar, etc.)
  //    Já logado → redirect para área apropriada
  // ──────────────────────────────────────────────────────────
  if (isPublicAuthPage(pathname) && isLoggedIn) {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    }
    return NextResponse.redirect(new URL('/conta', nextUrl));
  }

  return NextResponse.next();
});

// ============================================================================
// Matcher — em que rotas o middleware corre
// ============================================================================

/**
 * O proxy (Auth.js) só corre onde há REGRAS de acesso: admin, área de
 * cliente e páginas de autenticação.
 *
 * Antes corria em todas as páginas públicas (home, /servicos, /equipa,
 * sitemap.xml, robots.txt…), onde a única coisa que fazia era
 * `NextResponse.next()` — mas obrigava cada pedido de um visitante ou
 * do Googlebot a passar pela validação de sessão do Auth.js, somando
 * latência (TTFB) sem proteger nada.
 *
 * A sessão continua a funcionar nas páginas públicas: a navbar lê-a no
 * servidor com `auth()` e o SessionProvider renova-a via /api/auth.
 *
 * ⚠️ Rota nova que exija login → acrescentar aqui E nas funções acima.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/conta/:path*',
    '/entrar/:path*',
    '/registar/:path*',
    '/recuperar-password/:path*',
    '/redefinir-password/:path*',
  ],
};
