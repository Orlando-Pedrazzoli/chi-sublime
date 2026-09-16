// 📄 scripts/confirm-pending-bookings.ts
/**
 * Chi Sublime — Migração: confirmar reservas futuras pendentes
 * ============================================================
 *
 * PORQUÊ
 * ------
 * Até agora TODAS as reservas online nasciam 'pending', embora o
 * cliente já tivesse recebido "marcação confirmada". Com a política
 * de confirmação instantânea (src/lib/booking/policy.ts) as novas já
 * nascem 'confirmed'. Este script alinha as FUTURAS que ficaram para
 * trás, para a agenda do admin não mostrar "por confirmar" em
 * marcações que o cliente dá como certas.
 *
 * O QUE FAZ
 * ---------
 *  - Reservas com status 'pending', startTime no futuro e source
 *    'website' passam a 'confirmed' (updateMany — não dispara emails:
 *    os clientes já tinham recebido a confirmação).
 *  - Não toca em reservas passadas, manuais do admin, nem noutros estados.
 *
 * USO
 * ---
 *   npx tsx scripts/confirm-pending-bookings.ts --dry-run   # só lista
 *   npx tsx scripts/confirm-pending-bookings.ts             # aplica
 *   npx tsx scripts/confirm-pending-bookings.ts --uri="mongodb+srv://..."
 *
 * ⚠️ Correr o --dry-run primeiro, contra a base de produção certa.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Booking } from '../src/lib/models/Booking';

const DRY_RUN = process.argv.includes('--dry-run');

function loadMongoUri(): string {
  const uriArg = process.argv.find((a) => a.startsWith('--uri='));
  if (uriArg) return uriArg.slice('--uri='.length);
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^MONGODB_URI\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // sem .env.local
  }
  console.error('❌ MONGODB_URI não encontrado (--uri, ambiente ou .env.local)');
  process.exit(1);
}

function describeTarget(uri: string): string {
  const host = uri.match(/@([^/]+)/)?.[1] ?? '?';
  const db = uri.split('/').pop()?.split('?')[0] ?? '?';
  return `host=${host}  db=${db}`;
}

const fmt = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

async function main() {
  const uri = loadMongoUri();
  console.log(`\n🔌 ${describeTarget(uri)}${DRY_RUN ? '  (DRY RUN)' : ''}\n`);
  await mongoose.connect(uri);

  const filter = {
    status: 'pending',
    source: 'website',
    startTime: { $gt: new Date() },
  };

  const pending = await Booking.find(filter)
    .select('bookingNumber startTime')
    .sort({ startTime: 1 })
    .lean();

  if (pending.length === 0) {
    console.log('✅ Nenhuma reserva online futura pendente. Nada a fazer.\n');
    await mongoose.disconnect();
    return;
  }

  console.log(`Encontradas ${pending.length} reservas pendentes:\n`);
  for (const b of pending) {
    console.log(`   ${b.bookingNumber}  ${fmt.format(b.startTime)}`);
  }

  if (DRY_RUN) {
    console.log('\nℹ️  Dry run — nada foi alterado.\n');
  } else {
    // updateMany não corre o pre('validate'); blocksSlot mantém-se true
    // porque 'confirmed' também ocupa a agenda.
    const res = await Booking.updateMany(filter, { $set: { status: 'confirmed' } });
    console.log(`\n✅ ${res.modifiedCount} reservas passaram a 'confirmed'.\n`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Falhou:', err);
  process.exit(1);
});
