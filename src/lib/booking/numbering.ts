/**
 * Chi Sublime — Booking Numbering
 * ============================================================
 *
 * Wrapper de conveniencia que re-exporta os helpers do Counter
 * model. Mantemos este ficheiro vazio em termos de logica para
 * permitir extensoes futuras (ex: numeração específica para
 * cancelamentos, lista de espera, etc.).
 *
 * A logica atomica esta no Counter.ts (já implementado no Sprint 2).
 */

export {
  generateBookingNumber,
  generateTransactionNumber,
  getNextNumber,
} from '@/lib/models/Counter';
