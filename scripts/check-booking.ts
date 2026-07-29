// 📄 scripts/check-booking.ts
/**
 * Chi Sublime — Inspecionar reservas (SÓ LEITURA)
 * ============================================================
 *
 * Mostra os campos que interessam para perceber COMO e QUANDO
 * uma reserva foi criada — sobretudo `source` (online vs admin)
 * e a antecedência em dias face ao limite BOOKING_RULES.
 *
 * PORQUÊ
 * ------
 * O createBookingAction chama getAvailableSlots, que valida
 * `too-far` (máx. maxAdvanceDays de antecedência). Se existir
 * uma reserva online para lá desse horizonte, ou a validação
 * falhou, ou a reserva não veio do site. Este script diz qual.
 *
 * USO
 * ---
 *   npx tsx scripts/check-booking.ts --uri=...              # próximas 20
 *   npx tsx scripts/check-booking.ts 2026-09-26 --uri=...   # um dia
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Booking } from '../src/lib/models/Booking';
import { BOOKING_RULES } from '../src/lib/constants/business';

function describeUri(uri: string): string {
  try {
    const withoutCreds = uri.replace(/\/\/[^@]+@/, '//<credenciais>@');
    const dbName = uri.split('/').pop()?.split('?')[0] ?? '?';
    const host = withoutCreds.match(/@([^/]+)/)?.[1] ?? '?';
    return `host=${host}  db=${dbName}`;
  } catch {
    return '(não foi possível interpretar o URI)';
  }
}

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
    // .env.local não existe
  }

  console.error('❌ MONGODB_URI não encontrado');
  process.exit(1);
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Dias inteiros entre duas datas (base: dia civil) */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

async function main() {
  const uri = loadMongoUri();
  await mongoose.connect(uri);

  const dayArg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

  console.log('\n' + '═'.repeat(70));
  console.log('  CHI SUBLIME — Inspeção de reservas (só leitura)');
  console.log('═'.repeat(70));
  console.log(`  Ligado a: ${describeUri(uri)}`);
  console.log(`  Limite de antecedência (BOOKING_RULES): ${BOOKING_RULES.maxAdvanceDays} dias`);

  const filter: Record<string, unknown> = dayArg
    ? {
        startTime: {
          $gte: new Date(`${dayArg}T00:00:00.000Z`),
          $lt: new Date(`${dayArg}T23:59:59.999Z`),
        },
      }
    : { startTime: { $gte: new Date() } };

  const bookings = await Booking.find(filter).sort({ startTime: 1 }).limit(20).lean();

  if (bookings.length === 0) {
    console.log('\n  (nenhuma reserva encontrada)');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n  ${bookings.length} reserva(s):\n`);

  for (const b of bookings) {
    const start = new Date(b.startTime);
    const created = new Date(b.createdAt);
    const advance = daysBetween(created, start);
    const overLimit = advance > BOOKING_RULES.maxAdvanceDays;

    console.log(`  ── ${b.bookingNumber ?? String(b._id).slice(-6)} ────────────────────────`);
    console.log(`     Marcada para : ${fmt(start)}`);
    console.log(`     Criada em    : ${fmt(created)}`);
    console.log(`     Antecedência : ${advance} dias  ${overLimit ? '❌ ACIMA DO LIMITE' : '✅'}`);
    console.log(`     source       : ${b.source ?? '(vazio)'}`);
    console.log(`     createdBy    : ${b.createdBy ? String(b.createdBy) : '— (sem admin)'}`);
    console.log(`     status       : ${b.status}`);
    console.log('');
  }

  // ── Veredicto ────────────────────────────────────────────
  const suspicious = bookings.filter((b) => {
    const advance = daysBetween(new Date(b.createdAt), new Date(b.startTime));
    return advance > BOOKING_RULES.maxAdvanceDays && b.source === 'website';
  });

  console.log('═'.repeat(70));
  if (suspicious.length > 0) {
    console.log(`  ❌ ${suspicious.length} reserva(s) source='website' acima do limite.`);
    console.log('     A validação `too-far` do availability.ts não travou —');
    console.log('     é um bug real do fluxo público de reserva.');
  } else {
    console.log("  ✅ Nenhuma reserva source='website' excede o limite.");
    console.log("     Reservas acima do limite com source 'admin', 'phone',");
    console.log("     'walk-in' ou 'instagram' são normais — foram criadas");
    console.log('     manualmente, onde o limite de antecedência não se aplica.');
  }
  console.log('═'.repeat(70) + '\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Inspeção falhou:', err);
  process.exit(1);
});
