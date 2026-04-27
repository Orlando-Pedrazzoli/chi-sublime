/**
 * Chi Sublime — next-intl routing configuration
 * ============================================================
 *
 * Define como o next-intl gere as rotas i18n:
 * - Quais idiomas existem
 * - Qual o default
 * - Como prefixar URLs (ex: /pt/servicos vs /en/services)
 */

import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,

  // "always" = todas as rotas têm prefixo (/pt/..., /en/...)
  // "as-needed" = / vai para defaultLocale, /en/ explícito
  localePrefix: 'always',
});
