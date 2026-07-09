/**
 * Chi Sublime — Taxas de IVA (Portugal continental)
 * ============================================================
 *
 * Serviços de cabeleireiro/estética são geralmente à taxa normal (23%).
 * As restantes existem para casos pontuais e emissão de fatura.
 */

export type VatRate = 23 | 13 | 6 | 0;

export const VAT_RATES: VatRate[] = [23, 13, 6, 0];

export const VAT_RATE_LABEL: Record<VatRate, string> = {
  23: 'Taxa normal (23%)',
  13: 'Taxa intermédia (13%)',
  6: 'Taxa reduzida (6%)',
  0: 'Isento (0%)',
};

export const DEFAULT_VAT_RATE: VatRate = 23;

/**
 * Extrai o IVA contido num preço com imposto incluído (preços do
 * salão são sempre com IVA incluído).
 *
 * @param grossCents preço final em cêntimos (IVA incluído)
 * @param rate taxa aplicável
 * @returns { net, vat } em cêntimos
 *
 * @example
 * vatBreakdownFromGross(2460, 23) // { net: 2000, vat: 460 }
 */
export function vatBreakdownFromGross(
  grossCents: number,
  rate: VatRate,
): { net: number; vat: number } {
  if (rate === 0) return { net: grossCents, vat: 0 };
  const net = Math.round((grossCents * 100) / (100 + rate));
  return { net, vat: grossCents - net };
}
