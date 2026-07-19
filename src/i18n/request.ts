// 📄 src/i18n/request.ts
/**
 * Chi Sublime — next-intl request configuration (cookie-based)
 * ============================================================
 *
 * Estratégia "without i18n routing": o locale NÃO vem da URL,
 * vem do cookie NEXT_LOCALE (definido pelo LangSwitcher via
 * Server Action). Sem cookie → default 'pt'.
 *
 * Esta função corre uma vez por request (React cache) e alimenta
 * getLocale(), getTranslations() e o NextIntlClientProvider.
 *
 * Refª: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale, LOCALE_COOKIE } from './config';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;

  const locale = cookieValue && isValidLocale(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Europe/Lisbon',
  };
});
