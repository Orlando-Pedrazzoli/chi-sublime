/**
 * Chi Sublime — next-intl request configuration
 * ============================================================
 *
 * Esta função é chamada pelo next-intl em CADA request para
 * determinar qual o idioma e carregar as mensagens correspondentes.
 *
 * Refª: https://next-intl-docs.vercel.app/docs/usage/configuration
 */

import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // Determina o locale da URL (ex: /pt/servicos -> "pt")
  const requested = await requestLocale;

  // Valida — se for inválido ou inexistente, cai no default
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Carrega as mensagens do JSON correspondente (pt.json ou en.json)
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Europe/Lisbon',
  };
});
