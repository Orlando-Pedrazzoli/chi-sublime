// 📄 src/lib/server-actions/locale.ts
'use server';

/**
 * Chi Sublime — Server Action: trocar idioma
 * ============================================================
 *
 * Padrão oficial next-intl "without routing": o cliente invoca
 * esta action, o cookie NEXT_LOCALE é atualizado e o Next.js
 * invalida o Router Cache — o LangSwitcher completa com
 * router.refresh() para re-renderizar os Server Components
 * já no novo idioma, sem full reload.
 *
 * Cookie:
 * - maxAge 1 ano  → preferência sobrevive entre sessões
 * - sameSite lax  → obrigatório para iOS Safari (lição do Caru)
 * - path '/'      → válido em todo o site
 */

import { cookies } from 'next/headers';
import { isValidLocale, LOCALE_COOKIE } from '@/i18n/config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: string): Promise<void> {
  // Nunca confiar no input do cliente — valida contra a whitelist
  if (!isValidLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}
