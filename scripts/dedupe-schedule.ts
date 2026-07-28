// 📄 scripts/dedupe-schedule.ts
/**
 * Chi Sublime — Dedupe de documentos Schedule
 * ============================================================
 *
 * PORQUÊ ESTE SCRIPT EXISTE
 * -------------------------
 * Os unique parciais do Schedule (type+dayOfWeek para 'regular',
 * type+date para 'holiday'/'exception') podem ter falhado
 * silenciosamente na criação, deixando DUPLICADOS antigos na BD.
 *
 * Com duplicados, o schedule-resolver (findOne, ordem natural)
 * e o month-availability (map em memória) podiam escolher
 * documentos DIFERENTES → o calendário do cliente mostrava um
 * horário e a grelha de slots outro. O código já foi corrigido
 * para ambos escolherem o updatedAt mais recente, mas os
 * duplicados devem ser limpos para o unique index poder ser
 * criado pelo sync-indexes.
 *
 * O QUE FAZ
 * ---------
 *   1. type='regular': agrupa por dayOfWeek, mantém o documento
 *      com updatedAt mais recente, apaga os restantes.
 *   2. type='holiday' e type='exception': agrupa por dia de
 *      calendário (Lisboa), mesma regra.
 *   3. Lista tudo o que vai apagar ANTES de apagar.
 *
 * USO
 * ---
 *   npx tsx scripts/dedupe-schedule.ts --dry-run   # só mostra
 *   npx tsx scripts/dedupe-schedule.ts             # aplica
 *
 * Depois de aplicar, correr:
 *   npx tsx scripts/sync-indexes.ts
 *
 * Requer MONGODB_URI no ambiente ou em .env.local.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Schedule, type ISchedule } from '../src/lib/models/Schedule';
import { formatInTimeZone } from 'date-fns-tz';

const DRY_RUN = process.argv.includes('--dry-run');
const SALON_TIMEZONE = 'Europe/Lisbon';

// ------------------------------------------------------------
// MONGODB_URI (.env.local se não estiver no ambiente)
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
    /* cai no erro abaixo */
  }
  console.error('❌ MONGODB_URI não encontrado (ambiente ou .env.local)');
  process.exit(1);
}

/** Mostra a que base de dados nos ligámos, SEM revelar a password. */
function describeUri(uri: string): string {
  try {
    const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    return `${u.hostname}${u.pathname || ''}`;
  } catch {
    return '(uri ilegível)';
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function updatedAtMs(s: ISchedule): number {
  return s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
}

function toLisbonISO(date: Date): string {
  return formatInTimeZone(date, SALON_TIMEZONE, 'yyyy-MM-dd');
}

function fmt(s: ISchedule): string {
  const when = s.updatedAt ? new Date(s.updatedAt).toISOString() : 'sem updatedAt';
  const hours = s.open ? `${s.start}–${s.end}` : 'encerrado';
  return `_id=${String(s._id)}  ${hours}  (updatedAt ${when})`;
}

type Group = { key: string; label: string; docs: ISchedule[] };

/** Agrupa docs por chave e devolve só os grupos com duplicados. */
function findDuplicateGroups(
  docs: ISchedule[],
  keyOf: (s: ISchedule) => string,
  labelOf: (s: ISchedule) => string,
): Group[] {
  const byKey = new Map<string, Group>();
  for (const doc of docs) {
    const key = keyOf(doc);
    const group = byKey.get(key) ?? { key, label: labelOf(doc), docs: [] };
    group.docs.push(doc);
    byKey.set(key, group);
  }
  return Array.from(byKey.values()).filter((g) => g.docs.length > 1);
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

async function main() {
  const uri = loadMongoUri();
  console.log(`\n🔗 Ligado a: ${describeUri(uri)}`);
  console.log(
    DRY_RUN ? '🧪 MODO DRY-RUN — nada será apagado\n' : '⚠️  MODO REAL — vai apagar duplicados\n',
  );

  await mongoose.connect(uri);

  const all = (await Schedule.find({}).lean()) as unknown as ISchedule[];

  const regulars = all.filter(
    (s) => s.type === 'regular' && s.dayOfWeek !== undefined && s.dayOfWeek !== null,
  );
  const holidays = all.filter((s) => s.type === 'holiday' && s.date);
  const exceptions = all.filter((s) => s.type === 'exception' && s.date);

  const groups: { title: string; groups: Group[] }[] = [
    {
      title: "type='regular' (por dayOfWeek)",
      groups: findDuplicateGroups(
        regulars,
        (s) => `regular|${s.dayOfWeek}`,
        (s) => DAY_LABELS[s.dayOfWeek!] ?? `dayOfWeek=${s.dayOfWeek}`,
      ),
    },
    {
      title: "type='holiday' (por dia, Lisboa)",
      groups: findDuplicateGroups(
        holidays,
        (s) => `holiday|${toLisbonISO(new Date(s.date!))}`,
        (s) => toLisbonISO(new Date(s.date!)),
      ),
    },
    {
      title: "type='exception' (por dia, Lisboa)",
      groups: findDuplicateGroups(
        exceptions,
        (s) => `exception|${toLisbonISO(new Date(s.date!))}`,
        (s) => toLisbonISO(new Date(s.date!)),
      ),
    },
  ];

  const idsToDelete: mongoose.Types.ObjectId[] = [];
  let totalGroups = 0;

  for (const section of groups) {
    if (section.groups.length === 0) continue;
    console.log(`── ${section.title} ──────────────────────────────`);
    for (const g of section.groups) {
      totalGroups++;
      const sorted = [...g.docs].sort((a, b) => updatedAtMs(b) - updatedAtMs(a));
      const [keep, ...remove] = sorted;
      console.log(`\n  ${g.label}: ${g.docs.length} documentos`);
      console.log(`    ✅ MANTER  ${fmt(keep)}`);
      for (const doc of remove) {
        console.log(`    🗑️  APAGAR ${fmt(doc)}`);
        idsToDelete.push(doc._id);
      }
    }
    console.log('');
  }

  if (totalGroups === 0) {
    console.log('✅ Sem duplicados no Schedule. Nada a fazer.');
  } else if (DRY_RUN) {
    console.log(
      `🧪 Dry-run: ${idsToDelete.length} documento(s) SERIAM apagados em ${totalGroups} grupo(s).`,
    );
    console.log('   Corre sem --dry-run para aplicar.');
  } else {
    const res = await Schedule.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`✅ Apagados ${res.deletedCount} documento(s) duplicado(s).`);
    console.log('👉 Agora corre: npx tsx scripts/sync-indexes.ts');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
