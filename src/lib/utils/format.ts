/**
 * Chi Sublime — Formatting utilities (Portuguese locale)
 * ============================================================
 *
 * Todas as funções de formatação para exibição na UI.
 * Convenções portuguesas: € após valor, vírgula decimal, ponto milhares.
 */

import { centsToEuros } from './cents';

const PT_LOCALE = 'pt-PT';
const TIMEZONE = 'Europe/Lisbon';

/**
 * Formata cêntimos como moeda portuguesa.
 *
 * @example
 * formatCurrency(4500)   // "45,00 €"
 * formatCurrency(123456) // "1 234,56 €"
 * formatCurrency(0)      // "0,00 €"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(PT_LOCALE, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToEuros(cents));
}

/**
 * Formata cêntimos sem símbolo €.
 *
 * @example
 * formatAmount(4500) // "45,00"
 */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat(PT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToEuros(cents));
}

/**
 * Formata número como percentagem.
 *
 * @example
 * formatPercent(86)    // "86%"
 * formatPercent(86.5)  // "86,5%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return new Intl.NumberFormat(PT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Formata data como "27 abr 2026".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(PT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(d);
}

/**
 * Formata data longa: "Segunda-feira, 27 de Abril de 2026".
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(PT_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(d);
}

/**
 * Formata apenas a hora: "14:30".
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(PT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(d);
}

/**
 * Formata data + hora: "27 abr 2026, 14:30".
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(PT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(d);
}

/**
 * Formata duração em minutos para "X h Y min" ou "X min".
 *
 * @example
 * formatDuration(45)   // "45 min"
 * formatDuration(90)   // "1 h 30 min"
 * formatDuration(120)  // "2 h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

/**
 * Formata número de telefone português: "+351 932 932 691".
 *
 * @example
 * formatPhone("351932932691")    // "+351 932 932 691"
 * formatPhone("932932691")       // "+351 932 932 691"
 * formatPhone("+351 932 932 691") // "+351 932 932 691"
 */
export function formatPhone(phone: string): string {
  // Remove tudo que não seja dígito
  const digits = phone.replace(/\D/g, '');

  // Sem prefixo: assume PT
  if (digits.length === 9) {
    return `+351 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Com prefixo PT
  if (digits.length === 12 && digits.startsWith('351')) {
    const local = digits.slice(3);
    return `+351 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  // Outro formato: devolve original
  return phone;
}

/**
 * Trunca texto longo, adiciona "...".
 *
 * @example
 * truncate("Lorem ipsum dolor sit amet", 10) // "Lorem ipsu..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitaliza primeira letra.
 *
 * @example
 * capitalize("maria silva") // "Maria silva"
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Iniciais para avatar (primeiras letras de cada palavra, max 2).
 *
 * @example
 * getInitials("Jean Pierre")  // "JP"
 * getInitials("Maria")        // "M"
 * getInitials("Ana Rita Costa") // "AR"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
