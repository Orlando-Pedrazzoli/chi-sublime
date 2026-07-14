// 📄 scripts/seed-schedule.ts
/**
 * Chi Sublime — Seed: Horário semanal do salão
 * ============================================================
 *
 * Cria/atualiza os 7 documentos Schedule type='regular' com o
 * horário REAL do salão (fonte: perfil Noona, jul/2026):
 *
 *   Segunda a Sexta  10:00 – 19:00
 *   Sábado           Encerrado
 *   Domingo          Encerrado
 *
 * Sem estes documentos, o schedule-resolver devolve "fechado"
 * para todos os dias e o site não mostra disponibilidade.
 * Idempotente: pode correr as vezes que for preciso.
 *
 * Uso:
 *   npx tsx scripts/seed-schedule.ts
 *
 * Requer MONGODB_URI no ambiente ou em .env.local.
 * NOTA: os mesmos dados podem ser geridos pela interface em
 * /admin/horarios — este seed serve para ambientes novos/dev.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Schedule } from '../src/lib/models/Schedule';

// ------------------------------------------------------------
// Carregar MONGODB_URI (.env.local se não estiver no ambiente)
// ------------------------------------------------------------

function loadMongoUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^MONGODB_URI\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env.local não existe — cai no erro abaixo
  }

  console.error('❌ MONGODB_URI não encontrado (ambiente ou .env.local)');
  process.exit(1);
}

// ------------------------------------------------------------
// Horário real do salão (Noona)
// ------------------------------------------------------------

type WeekEntry = { dayOfWeek: number; label: string; open: boolean; start?: string; end?: string };

const SALON_WEEK: WeekEntry[] = [
  { dayOfWeek: 1, label: 'Segunda', open: true, start: '10:00', end: '19:00' },
  { dayOfWeek: 2, label: 'Terça', open: true, start: '10:00', end: '19:00' },
  { dayOfWeek: 3, label: 'Quarta', open: true, start: '10:00', end: '19:00' },
  { dayOfWeek: 4, label: 'Quinta', open: true, start: '10:00', end: '19:00' },
  { dayOfWeek: 5, label: 'Sexta', open: true, start: '10:00', end: '19:00' },
  { dayOfWeek: 6, label: 'Sábado', open: false },
  { dayOfWeek: 0, label: 'Domingo', open: false },
];

// ------------------------------------------------------------
// SEED
// ------------------------------------------------------------

async function main() {
  const uri = loadMongoUri();
  await mongoose.connect(uri);
  console.log('✅ Ligado ao MongoDB\n');

  for (const day of SALON_WEEK) {
    let doc = await Schedule.findOne({ type: 'regular', dayOfWeek: day.dayOfWeek });

    if (!doc) {
      doc = new Schedule({
        type: 'regular',
        dayOfWeek: day.dayOfWeek,
        open: false,
        breaks: [],
      });
    }

    doc.open = day.open;
    doc.start = day.open ? day.start : undefined;
    doc.end = day.open ? day.end : undefined;
    doc.set('breaks', []);

    await doc.save();

    console.log(
      `  ${day.label.padEnd(9)} → ${day.open ? `${day.start} – ${day.end}` : 'Encerrado'}`,
    );
  }

  console.log('\n✅ Horário semanal do salão gravado (7 dias).');
  console.log('   Gerível a partir de agora em /admin/horarios.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Seed falhou:', err);
  process.exit(1);
});
