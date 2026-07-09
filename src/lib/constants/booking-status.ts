/**
 * Chi Sublime — Estados e origens de reserva (apresentação)
 * ============================================================
 *
 * Mapeia os valores técnicos do model (BookingStatus / BookingSource)
 * para etiquetas em português e cores da marca, e define quais as
 * transições de estado permitidas (máquina de estados).
 */

import type { BookingStatus, BookingSource } from '@/lib/models';

// ============================================================
// ESTADOS
// ============================================================

export type StatusVisual = {
  label: string;
  /** Classe de texto Tailwind */
  text: string;
  /** Classe de fundo Tailwind (badge) */
  bg: string;
  /** Cor do ponto indicador */
  dot: string;
};

export const BOOKING_STATUS_VISUAL: Record<BookingStatus, StatusVisual> = {
  pending: {
    label: 'Pendente',
    text: 'text-chi-warning',
    bg: 'bg-chi-warning-bg',
    dot: 'bg-chi-warning',
  },
  confirmed: {
    label: 'Confirmada',
    text: 'text-chi-info',
    bg: 'bg-chi-info-bg',
    dot: 'bg-chi-info',
  },
  'in-progress': {
    label: 'Em curso',
    text: 'text-chi-green-soft',
    bg: 'bg-chi-sand',
    dot: 'bg-chi-green-soft',
  },
  completed: {
    label: 'Concluída',
    text: 'text-chi-success',
    bg: 'bg-chi-success-bg',
    dot: 'bg-chi-success',
  },
  cancelled: {
    label: 'Cancelada',
    text: 'text-chi-danger',
    bg: 'bg-chi-danger-bg',
    dot: 'bg-chi-danger',
  },
  'no-show': {
    label: 'Não compareceu',
    text: 'text-chi-charcoal-soft',
    bg: 'bg-chi-border-light',
    dot: 'bg-chi-charcoal-light',
  },
};

/**
 * Transições de estado permitidas (máquina de estados).
 * Evita saltos inválidos como cancelled → confirmed sem revalidação.
 */
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'no-show'],
  confirmed: ['in-progress', 'completed', 'cancelled', 'no-show'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================
// ORIGENS
// ============================================================

export const BOOKING_SOURCE_LABEL: Record<BookingSource, string> = {
  website: 'Website',
  phone: 'Telefone',
  'walk-in': 'Walk-in',
  instagram: 'Instagram',
  admin: 'Manual (admin)',
};
