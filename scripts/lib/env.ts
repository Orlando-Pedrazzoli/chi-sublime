// 📄 scripts/lib/env.ts
/**
 * Chi Sublime — Carregamento de ambiente para scripts de CLI
 * ============================================================
 *
 * Importar como PRIMEIRO import do script (`import './lib/env';`).
 * Os módulos da app leem variáveis no momento do import (ex.:
 * MONGODB_URI em db/connect.ts, MOLONI_BASE_URL), por isso o ambiente
 * tem de estar pronto antes de qualquer outro import.
 *
 * Ordem: variáveis já definidas > .env.local > .env
 *
 * Flags globais (definem a base de dados alvo sem editar ficheiros):
 *   --mongo-uri="mongodb+srv://..."   → MONGODB_URI
 *   --db=chi-sublime                  → MONGODB_DB_NAME
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local'), quiet: true });
config({ path: resolve(process.cwd(), '.env'), quiet: true });

function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).replace(/^["']|["']$/g, '') : undefined;
}

const mongoUri = flag('mongo-uri');
if (mongoUri) process.env.MONGODB_URI = mongoUri;
const dbName = flag('db');
if (dbName) process.env.MONGODB_DB_NAME = dbName;

export function argFlag(name: string): string | undefined {
  return flag(name);
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** Termina com mensagem clara se não houver MONGODB_URI (senão o mongoose fica à espera 10s). */
export function assertMongoUri(): void {
  if (!process.env.MONGODB_URI) {
    console.error('\n❌ MONGODB_URI não definido (.env.local ou --mongo-uri="...")\n');
    process.exit(1);
  }
}

/** host + base de dados alvo, sem credenciais — para confirmar antes de gravar. */
export function describeMongoTarget(): string {
  const uri = process.env.MONGODB_URI ?? '';
  const host = uri.match(/@([^/?]+)/)?.[1] ?? '(sem MONGODB_URI)';
  // Igual a src/lib/db/connect.ts: o dbName vem de MONGODB_DB_NAME (default chi-sublime)
  const db = process.env.MONGODB_DB_NAME ?? 'chi-sublime';
  return `host=${host}  db=${db}`;
}
