// 📄 src/lib/utils/localized.ts
/**
 * Chi Sublime — helper para conteúdo bilingue vindo da DB
 * ============================================================
 *
 * Os modelos (Category, Service, ...) guardam texto como
 * { pt: string, en?: string }. Este helper resolve o idioma
 * ativo com FALLBACK GARANTIDO para PT — se o Jean Pierre
 * ainda não preencheu o EN de um registo, o site nunca mostra
 * um campo vazio.
 *
 * Uso (server components):
 *   const locale = (await getLocale()) as Locale;
 *   title: localizedField(cat.name, locale)
 */

import type { Locale } from '@/i18n/config';

type LocalizedField = { pt?: string; en?: string } | null | undefined;

export function localizedField(field: LocalizedField, locale: Locale): string {
  if (!field) return '';
  if (locale === 'en' && field.en) return field.en;
  return field.pt ?? '';
}
