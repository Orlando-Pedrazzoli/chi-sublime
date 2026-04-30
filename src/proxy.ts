import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
      url.searchParams.set('redirect', pathname);
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
      url.searchParams.set('redirect', pathname);
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

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (handled by route handlers)
     * - _next/static, _next/image (assets)
     * - favicon, manifest, images
     */
    '/((?!api|_next/static|_next/image|favicon|images|manifest).*)',
  ],
};
