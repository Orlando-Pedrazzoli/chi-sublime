/**
 * Chi Sublime — Tailwind class composition helper
 * ============================================================
 *
 * Combina classes Tailwind de forma inteligente:
 * - clsx: junta strings/objetos/arrays condicionalmente
 * - tailwind-merge: resolve conflitos (ex: "bg-red-500 bg-blue-500" → "bg-blue-500")
 *
 * Uso:
 * ```tsx
 * <div className={cn("p-4 bg-chi-cream", isActive && "bg-chi-gold")} />
 * ```
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
