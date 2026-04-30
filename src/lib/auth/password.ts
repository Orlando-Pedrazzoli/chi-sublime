import bcrypt from 'bcryptjs';

/**
 * Configuração de hashing de passwords.
 *
 * BCRYPT_ROUNDS:
 *  - 10 = ~10ms  (demasiado fraco em 2026)
 *  - 12 = ~150ms (equilíbrio recomendado — usado pela OWASP, GitHub, Auth0)
 *  - 14 = ~1s    (paranoid, atrasa UX de login)
 *
 * MAX_PASSWORD_BYTES:
 *  - bcrypt trunca silenciosamente passwords acima de 72 bytes.
 *    Validamos antecipadamente para evitar comportamento inesperado.
 */
const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Faz hash de uma password em texto plano.
 *
 * @param plainPassword Password do utilizador (mínimo 8 chars, máximo 72 bytes)
 * @returns Hash bcrypt (string de 60 chars)
 * @throws Error se a password for inválida
 *
 * @example
 *   const hash = await hashPassword('MinhaSenha123');
 *   // → "$2a$12$XYZ..."
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (typeof plainPassword !== 'string') {
    throw new Error('Password tem de ser uma string');
  }

  if (plainPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  // bcrypt trunca silenciosamente acima de 72 bytes — bloqueamos antes
  const byteLength = Buffer.byteLength(plainPassword, 'utf8');
  if (byteLength > MAX_PASSWORD_BYTES) {
    throw new Error(`Password demasiado longa (máximo ${MAX_PASSWORD_BYTES} bytes)`);
  }

  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Verifica se uma password em texto plano corresponde ao hash guardado.
 *
 * @param plainPassword Password introduzida pelo utilizador
 * @param hash Hash guardado na BD (User.passwordHash)
 * @returns true se a password está correcta, false caso contrário
 *
 * @example
 *   const valid = await verifyPassword('MinhaSenha123', user.passwordHash);
 *   if (!valid) throw new Error('Credenciais inválidas');
 */
export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  if (typeof plainPassword !== 'string' || typeof hash !== 'string') {
    return false;
  }

  if (plainPassword.length === 0 || hash.length === 0) {
    return false;
  }

  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch {
    // Hash malformado → password inválida (não exponer detalhes)
    return false;
  }
}

/**
 * Verifica se um hash precisa de ser regenerado com mais rounds.
 * Útil quando aumentamos BCRYPT_ROUNDS no futuro: a próxima vez que o
 * utilizador faz login, regeneramos o hash com a nova configuração.
 *
 * @param hash Hash guardado na BD
 * @returns true se o hash usa menos rounds que o configurado actualmente
 *
 * @example
 *   if (await verifyPassword(input, user.passwordHash)) {
 *     if (needsRehash(user.passwordHash)) {
 *       user.passwordHash = await hashPassword(input);
 *       await user.save();
 *     }
 *   }
 */
export function needsRehash(hash: string): boolean {
  if (typeof hash !== 'string' || hash.length === 0) {
    return true;
  }

  try {
    const rounds = bcrypt.getRounds(hash);
    return rounds < BCRYPT_ROUNDS;
  } catch {
    // Hash malformado → precisa de rehash
    return true;
  }
}
