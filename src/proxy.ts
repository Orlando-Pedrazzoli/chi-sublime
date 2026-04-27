import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy (anteriormente "middleware") — Next.js 16+
 *
 * Por agora apenas deixa todas as requests passarem.
 * No Sprint 0 vamos adicionar:
 *  - Routing i18n (PT/EN com next-intl)
 *  - Proteção de rotas /admin (apenas admin pode aceder)
 *  - Proteção de rotas /conta (apenas clientes autenticados)
 */
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica-se a todas as rotas EXCETO:
    // - /api (API routes)
    // - /_next/static (assets estáticos)
    // - /_next/image (otimização de imagens)
    // - /favicon.ico
    // - ficheiros públicos com extensão (.svg, .png, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
