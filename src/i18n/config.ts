// 📄 src/i18n/config.ts
/**
 * Chi Sublime — i18n Configuration
 * ============================================================
 *
 * Define os idiomas suportados e o default.
 * Estas constantes são usadas pelo proxy (routing) e pelo next-intl.
 */

export const locales = ['pt', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pt';

/** Nome do cookie que persiste a preferência de idioma (convenção next-intl) */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeNames: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  pt: '🇵🇹',
  en: '🇬🇧',
};

/**
 * Type guard: verifica se uma string é um locale válido.
 */
export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
