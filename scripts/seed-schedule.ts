// 📄 scripts/seed-schedule.ts
/**
 * Chi Sublime — Seed: Horário semanal do salão
 * ============================================================
 *
 * Cria/atualiza os 7 documentos Schedule type='regular' a partir
 * de SALON_HOURS (src/lib/constants/business.ts) — a fonte de
 * verdade. Horário atual (confirmado por Jean Pierre, jul/2026):
 *
 *   Segunda          Encerrado
 *   Terça a Sábado   09:00 – 18:00
 *   Domingo          Encerrado
 *
 * ⚠️ Este script trata SÓ do horário do SALÃO. O availability.ts
 * cruza-o com Staff.workingHours — se os profissionais tiverem
 * outro horário gravado, os slots continuam errados. Para corrigir
 * salão + profissionais de uma vez: scripts/fix-salon-hours.ts
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
import { SALON_HOURS, type WeekDayIndex } from '../src/lib/constants/business';

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
// Horário derivado da fonte de verdade (constants/business.ts)
// ------------------------------------------------------------

const DAY_LABELS: Record<WeekDayIndex, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** Ordem de escrita/log: Segunda → Domingo */
const WEEK_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0];

type WeekEntry = { dayOfWeek: number; label: string; open: boolean; start?: string; end?: string };

const SALON_WEEK: WeekEntry[] = WEEK_ORDER.map((dayOfWeek) => {
  const hours = SALON_HOURS[dayOfWeek];
  return {
    dayOfWeek,
    label: DAY_LABELS[dayOfWeek],
    open: hours.open,
    start: hours.start,
    end: hours.end,
  };
});

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
