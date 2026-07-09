/**
 * Chi Sublime — Regras de negócio (single source of truth)
 * ============================================================
 *
 * Todos os números de política do salão vivem aqui. Antes estavam
 * hardcoded espalhados por availability.ts, bookings.ts, etc.
 * Alterar uma regra = alterar num único sítio.
 *
 * Dados da EMPRESA (nome, morada, NIF, contactos) NÃO vivem aqui —
 * são geridos em base de dados via FiscalSettings / SiteContent, para
 * o Jean Pierre poder editar sem deploy. Aqui ficam apenas fallbacks.
 */

// ============================================================
// TIMEZONE
// ============================================================

export const SALON_TIMEZONE = 'Europe/Lisbon';

// ============================================================
// AGENDAMENTO
// ============================================================

export const BOOKING_RULES = {
  /** Intervalo da grelha de slots mostrada ao cliente (min) */
  slotIntervalMinutes: 30,
  /** Antecedência mínima para reservar (horas) */
  minAdvanceHours: 1,
  /** Antecedência máxima para reservar (dias) */
  maxAdvanceDays: 30,
  /** Buffer aplicado após cada reserva por defeito (min) */
  defaultBufferMinutes: 5,
  /** Janela mínima para o cliente cancelar/reagendar sozinho (horas) */
  cancellationWindowHours: 24,
} as const;

// ============================================================
// TOGGLES DE POLÍTICA (diferenciadores vs Noona)
// ============================================================

export const BOOKING_POLICY = {
  /** Cliente pode reagendar sozinho dentro da janela permitida */
  allowClientReschedule: true,
  /** Cliente pode entrar em lista de espera quando não há slot */
  allowWaitlist: true,
  /**
   * Modo de aprovação: 'auto' confirma na hora, 'manual' cria como
   * pending para o salão aprovar. Pode ser sobreposto por staff.
   */
  approvalMode: 'auto' as 'auto' | 'manual',
  /** Máximo de reservas online por cliente/hora (anti-abuso) */
  maxOnlineBookingsPerHour: 3,
} as const;

// ============================================================
// FALLBACKS DE CONTACTO (a fonte real é a BD)
// ============================================================

export const SALON_CONTACT_FALLBACK = {
  name: 'Chi Sublime',
  phone: '+351 932 932 691',
  email: 'reservas@chisublime.pt',
  address: 'R. Estorninho, Loja E, Quinta da Bicuda',
  postalCode: '2750-686',
  city: 'Cascais',
  instagram: 'https://www.instagram.com/chiptsublime/',
} as const;

// ============================================================
// PAGINAÇÃO / UI
// ============================================================

export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
