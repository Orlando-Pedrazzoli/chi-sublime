// 📄 scripts/sync-indexes.ts
/**
 * Chi Sublime — Sync de índices MongoDB
 * ============================================================
 *
 * Alinha os índices reais da BD com os declarados nos schemas
 * Mongoose: apaga os que já não existem no código e cria os que
 * faltam (incluindo os unique parciais que podem ter falhado
 * silenciosamente por colisão de nome com os duplicados antigos).
 *
 * Correr DEPOIS de remover os índices duplicados do Schedule.ts
 * (e do AuditLog.ts, que tem o mesmo problema segundo o README):
 *
 *   npx tsx scripts/sync-indexes.ts
 *
 * Seguro de correr em produção (operação de metadados), mas
 * idealmente fora do horário de ponta.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Schedule } from '../src/lib/models/Schedule';
import { Booking } from '../src/lib/models/Booking';
import { Staff } from '../src/lib/models/Staff';

function loadMongoUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^MONGODB_URI\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* cai no erro abaixo */
  }
  console.error('❌ MONGODB_URI não encontrado (ambiente ou .env.local)');
  process.exit(1);
}

async function syncModel(name: string, model: mongoose.Model<never>) {
  const dropped = await model.syncIndexes();
  const indexes = await model.collection.indexes();
  console.log(`\n📦 ${name}`);
  if (dropped.length > 0) console.log(`   Removidos: ${dropped.join(', ')}`);
  for (const idx of indexes) {
    const flags = [
      idx.unique ? 'unique' : null,
      idx.partialFilterExpression ? 'partial' : null,
      idx.sparse ? 'sparse' : null,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`   ${idx.name}${flags ? `  [${flags}]` : ''}`);
  }
}

async function main() {
  await mongoose.connect(loadMongoUri());
  console.log('✅ Ligado ao MongoDB');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await syncModel('Schedule', Schedule as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await syncModel('Booking', Booking as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await syncModel('Staff', Staff as any);

  console.log('\n✅ Índices sincronizados com os schemas.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Sync falhou:', err);
  process.exit(1);
});
