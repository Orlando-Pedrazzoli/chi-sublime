/**
 * Chi Sublime — NIF (Número de Identificação Fiscal) validation
 * ============================================================
 *
 * Validação do NIF português usando o algoritmo oficial:
 * 1. Tem de ter 9 dígitos
 * 2. O primeiro dígito identifica o tipo (1-3, 5-9 válidos)
 * 3. Os primeiros 8 dígitos são multiplicados pelos pesos 9..2
 * 4. A soma mod 11 dá o dígito de controlo (9º dígito)
 *
 * Referência: https://pt.wikipedia.org/wiki/N%C3%BAmero_de_identifica%C3%A7%C3%A3o_fiscal
 */

/**
 * Tipos de entidade pelo primeiro dígito do NIF.
 */
export const NIF_FIRST_DIGIT_TYPES: Record<string, string> = {
  '1': 'Pessoa singular',
  '2': 'Pessoa singular',
  '3': 'Pessoa singular',
  '5': 'Pessoa coletiva',
  '6': 'Administração pública',
  '7': 'Outros (heranças, condomínios, etc.)',
  '8': 'Empresário em nome individual (descontinuado)',
  '9': 'Pessoa coletiva irregular',
};

const VALID_FIRST_DIGITS = ['1', '2', '3', '5', '6', '7', '8', '9'];

/**
 * Valida um NIF português.
 *
 * @param nif string ou número (ignora espaços e separadores)
 * @returns true se válido
 *
 * @example
 * isValidNIF("245678901")    // true/false dependendo do checksum
 * isValidNIF("123 456 789")  // true/false (espaços ignorados)
 * isValidNIF("123")          // false (menos de 9 dígitos)
 * isValidNIF("412345678")    // false (primeiro dígito 4 não é válido)
 */
export function isValidNIF(nif: string): boolean {
  if (!nif || typeof nif !== 'string') return false;

  // Remove espaços, hífens, pontos
  const cleaned = nif.replace(/[\s.\-]/g, '');

  // Tem de ter exatamente 9 dígitos
  if (!/^\d{9}$/.test(cleaned)) return false;

  // Primeiro dígito tem de ser válido (1, 2, 3, 5, 6, 7, 8, 9)
  if (!VALID_FIRST_DIGITS.includes(cleaned[0])) return false;

  // Calcula o dígito de controlo
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleaned[i], 10) * (9 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === parseInt(cleaned[8], 10);
}

/**
 * Limpa um NIF (remove espaços/pontos/hífens) para uso interno.
 *
 * @example
 * cleanNIF("123 456 789") // "123456789"
 * cleanNIF("123.456.789") // "123456789"
 */
export function cleanNIF(nif: string): string {
  return nif.replace(/[\s.\-]/g, '');
}

/**
 * Formata NIF para exibição: "123 456 789".
 *
 * @example
 * formatNIF("123456789") // "123 456 789"
 */
export function formatNIF(nif: string): string {
  const cleaned = cleanNIF(nif);
  if (cleaned.length !== 9) return nif; // devolve original se inválido
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
}

/**
 * Identifica o tipo de entidade pelo primeiro dígito.
 *
 * @example
 * getNIFType("245678901") // "Pessoa singular"
 * getNIFType("512345678") // "Pessoa coletiva"
 */
export function getNIFType(nif: string): string | null {
  const cleaned = cleanNIF(nif);
  if (cleaned.length < 1) return null;
  return NIF_FIRST_DIGIT_TYPES[cleaned[0]] ?? null;
}

/**
 * NIF especial "Consumidor final" — usado quando cliente não fornece NIF
 * em fatura simplificada (FS).
 */
export const CONSUMIDOR_FINAL_NIF = '999999990';
