/**
 * Chi Sublime — Código postal português
 * ============================================================
 *
 * Formato PT: NNNN-NNN (ex: "2750-686").
 */

const PT_POSTAL_REGEX = /^\d{4}-\d{3}$/;

/** Valida se está no formato NNNN-NNN */
export function isValidPostalCode(value: string): boolean {
  return PT_POSTAL_REGEX.test(value.trim());
}

/**
 * Normaliza input do utilizador para NNNN-NNN.
 * Aceita "2750686", "2750 686", "2750-686".
 *
 * @returns string normalizada ou null se não der para normalizar
 */
export function formatPostalCode(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 7) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/** Divide em { zone, extension } → "2750-686" → { zone: "2750", extension: "686" } */
export function splitPostalCode(value: string): { zone: string; extension: string } | null {
  if (!isValidPostalCode(value)) return null;
  const [zone, extension] = value.split('-');
  return { zone, extension };
}
