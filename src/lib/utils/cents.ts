/**
 * Chi Sublime — Money utilities
 * ============================================================
 *
 * Regra de ouro: valores monetários são SEMPRE armazenados como
 * cêntimos integer (ex: 4500 = €45,00).
 *
 * Razão: floats em JavaScript têm imprecisão (0.1 + 0.2 = 0.30000000000000004).
 * Em transações financeiras isto é INACEITÁVEL.
 *
 * Estes helpers fazem a conversão segura entre cêntimos e euros.
 */

/**
 * Converte euros (number) para cêntimos (integer).
 *
 * @example
 * eurosToCents(45.00)  // 4500
 * eurosToCents(12.50)  // 1250
 * eurosToCents(0.01)   // 1
 */
export function eurosToCents(euros: number): number {
  if (typeof euros !== 'number' || !isFinite(euros)) {
    throw new Error(`eurosToCents: valor inválido "${euros}"`);
  }
  // Math.round para evitar 1499.9999... → arredonda corretamente
  return Math.round(euros * 100);
}

/**
 * Converte cêntimos (integer) para euros (number).
 *
 * @example
 * centsToEuros(4500)  // 45.00
 * centsToEuros(1250)  // 12.50
 * centsToEuros(1)     // 0.01
 */
export function centsToEuros(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error(`centsToEuros: cêntimos têm de ser integer, recebido "${cents}"`);
  }
  return cents / 100;
}

/**
 * Soma valores em cêntimos com segurança (sem float drift).
 *
 * @example
 * sumCents([1234, 5678, 100])  // 7012
 */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => {
    if (!Number.isInteger(v)) {
      throw new Error(`sumCents: valor não-integer "${v}"`);
    }
    return acc + v;
  }, 0);
}

/**
 * Calcula IVA dado valor sem IVA + taxa.
 *
 * @param netCents valor sem IVA em cêntimos
 * @param vatRate taxa IVA (ex: 23 para 23%)
 * @returns objeto com {netCents, vatCents, totalCents}
 *
 * @example
 * calculateVAT(10000, 23)
 * // { netCents: 10000, vatCents: 2300, totalCents: 12300 }
 */
export function calculateVAT(
  netCents: number,
  vatRate: number,
): {
  netCents: number;
  vatCents: number;
  totalCents: number;
} {
  if (!Number.isInteger(netCents)) {
    throw new Error('calculateVAT: netCents tem de ser integer');
  }
  if (vatRate < 0 || vatRate > 100) {
    throw new Error(`calculateVAT: taxa inválida "${vatRate}"`);
  }

  const vatCents = Math.round((netCents * vatRate) / 100);
  return {
    netCents,
    vatCents,
    totalCents: netCents + vatCents,
  };
}

/**
 * Calcula valor sem IVA dado total + taxa.
 * Útil quando o cliente nos diz o total e queremos extrair o IVA.
 *
 * @example
 * extractVAT(12300, 23)
 * // { netCents: 10000, vatCents: 2300, totalCents: 12300 }
 */
export function extractVAT(
  totalCents: number,
  vatRate: number,
): {
  netCents: number;
  vatCents: number;
  totalCents: number;
} {
  if (!Number.isInteger(totalCents)) {
    throw new Error('extractVAT: totalCents tem de ser integer');
  }
  const netCents = Math.round((totalCents * 100) / (100 + vatRate));
  return {
    netCents,
    vatCents: totalCents - netCents,
    totalCents,
  };
}

/**
 * Aplica desconto percentual a valor em cêntimos.
 *
 * @example
 * applyDiscount(10000, 10)  // 9000  (10% off de €100)
 */
export function applyDiscount(cents: number, percentage: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error('applyDiscount: cents tem de ser integer');
  }
  if (percentage < 0 || percentage > 100) {
    throw new Error(`applyDiscount: percentagem inválida "${percentage}"`);
  }
  const discount = Math.round((cents * percentage) / 100);
  return cents - discount;
}
