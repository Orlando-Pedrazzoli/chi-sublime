// 📄 scripts/check-hours.ts
/**
 * Chi Sublime — Diagnóstico de horário (SÓ LEITURA)
 * ============================================================
 *
 * Mostra o que está REALMENTE gravado no MongoDB, lado a lado
 * com o horário definido em SALON_HOURS. Não grava nada, não
 * altera nada — pode correr as vezes que quiser, em produção.
 *
 * PARA QUE SERVE
 * --------------
 * As páginas /admin/horarios e /admin/equipa/[id] mostram estes
 * dados através da interface. Este script mostra os mesmos dados
 * em texto, para poder:
 *
 *   - Confirmar o estado ANTES da migração (o que está errado)
 *   - Confirmar o estado DEPOIS da migração (ficou tudo certo?)
 *   - Colar o output numa conversa, sem screenshots
 *
 * USO
 * ---
 *   npx tsx scripts/check-hours.ts
 *   npx tsx scripts/check-hours.ts 6a5e29c7130d580d3a2a7807   # um staff
 *
 * Requer MONGODB_URI no ambiente ou em .env.local.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Schedule } from '../src/lib/models/Schedule';
import { Staff, WEEKDAYS, type WeekDay } from '../src/lib/models/Staff';
import { SALON_HOURS, SALON_HOURS_BY_NAME, type WeekDayIndex } from '../src/lib/constants/business';

const DAY_LABELS: Record<WeekDayIndex, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** Ordem de leitura humana: Segunda → Domingo */
const WEEK_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0];

const NAME_TO_INDEX: Record<WeekDay, WeekDayIndex> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Mostra a que base de dados nos ligámos, SEM revelar a password.
 * É o dado mais importante: evita migrar a base errada.
 */
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
  // 1) --uri=... na linha de comandos (o mais fiável: não depende
  //    da sessão do terminal nem de variáveis de ambiente)
  const uriArg = process.argv.find((a) => a.startsWith('--uri='));
  if (uriArg) return uriArg.slice('--uri='.length);

  // 2) variável de ambiente
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

  console.error('❌ MONGODB_URI não encontrado (ambiente ou .env.local)');
  process.exit(1);
}

function fmt(open: boolean, start?: string, end?: string): string {
  return open ? `${start} – ${end}` : 'Encerrado';
}

// ------------------------------------------------------------
// 1 — Horário do salão (o que /admin/horarios mostra)
// ------------------------------------------------------------

async function checkSalon(): Promise<number> {
  console.log('\n📅 SALÃO — coleção Schedule (o que /admin/horarios mostra)');
  console.log('─'.repeat(64));
  console.log(`  ${'Dia'.padEnd(9)} ${'NA BASE DE DADOS'.padEnd(18)} ${'ESPERADO'.padEnd(18)}`);
  console.log('─'.repeat(64));

  let mismatches = 0;

  for (const dayOfWeek of WEEK_ORDER) {
    const doc = await Schedule.findOne({ type: 'regular', dayOfWeek }).lean();
    const expected = SALON_HOURS[dayOfWeek];

    const actualStr = doc ? fmt(doc.open, doc.start, doc.end) : '⚠️ NÃO EXISTE';
    const expectedStr = fmt(expected.open, expected.start, expected.end);
    const ok = doc && actualStr === expectedStr;
    if (!ok) mismatches++;

    console.log(
      `  ${DAY_LABELS[dayOfWeek].padEnd(9)} ${actualStr.padEnd(18)} ${expectedStr.padEnd(18)} ${ok ? '✅' : '❌'}`,
    );
  }

  return mismatches;
}

// ------------------------------------------------------------
// 2 — Horário dos profissionais (o que /admin/equipa/[id] mostra)
// ------------------------------------------------------------

async function checkStaff(onlyId?: string): Promise<number> {
  console.log('\n👥 PROFISSIONAIS — Staff.workingHours');
  console.log('   (o que /admin/equipa/[id] mostra no editor de horário)');
  console.log('─'.repeat(64));

  const query = onlyId ? { _id: onlyId } : {};
  const allStaff = await Staff.find(query).lean();

  if (allStaff.length === 0) {
    console.log(onlyId ? `  ⚠️ Nenhum profissional com o id ${onlyId}` : '  (base de dados vazia)');
    return 0;
  }

  let mismatches = 0;

  for (const staff of allStaff) {
    console.log(`\n  ${staff.name}  ·  ${staff.active ? 'ativo' : 'INATIVO'}`);
    console.log(`  id: ${String(staff._id)}`);
    console.log(`  ${'-'.repeat(60)}`);

    for (const day of WEEKDAYS) {
      const cfg = staff.workingHours?.[day];
      const salon = SALON_HOURS_BY_NAME[day];

      const actualStr = cfg?.enabled ? `${cfg.start} – ${cfg.end}` : 'Desligado';
      const expectedStr = fmt(salon.open, salon.start, salon.end);

      // Um profissional pode legitimamente trabalhar MENOS que o salão.
      // O que nunca pode é estar ligado num dia em que o salão fecha,
      // nem desligado num dia em que o salão abre.
      const dayOk = Boolean(cfg?.enabled) === salon.open;
      // Em dias de encerramento, "Desligado" (staff) e "Encerrado"
      // (salão) são a MESMA coisa — só mudam as palavras. Comparar
      // as strings marcaria um ⚠️ falso todas as segundas e domingos.
      const exact = salon.open ? actualStr === expectedStr : true;
      if (!dayOk) mismatches++;

      const flag = dayOk ? (exact ? '✅' : '⚠️  horário próprio') : '❌';
      console.log(
        `  ${DAY_LABELS[NAME_TO_INDEX[day]].padEnd(9)} ${actualStr.padEnd(18)} ${expectedStr.padEnd(18)} ${flag}`,
      );

      if (cfg?.breaks?.length) {
        for (const b of cfg.breaks) console.log(`  ${''.padEnd(9)} pausa ${b.start} – ${b.end}`);
      }
    }
  }

  return mismatches;
}

// ------------------------------------------------------------
// 3 — Feriados e exceções (podem tapar dias abertos)
// ------------------------------------------------------------

async function checkOverrides() {
  console.log('\n🎌 FERIADOS E EXCEÇÕES (sobrepõem-se ao horário semanal)');
  console.log('─'.repeat(64));

  const holidays = await Schedule.find({ type: 'holiday' }).lean();
  const exceptions = await Schedule.find({ type: 'exception' })
    .where('date')
    .gte(Date.now() as never)
    .lean();

  console.log(`  ${holidays.length} feriado(s) configurado(s)`);
  console.log(`  ${exceptions.length} exceção(ões) futura(s)`);

  for (const e of exceptions) {
    const d = e.date ? new Date(e.date).toLocaleDateString('pt-PT') : '?';
    console.log(`    ${d}  ${e.open ? `${e.start} – ${e.end}` : 'ENCERRADO'}  ${e.reason ?? ''}`);
  }
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

async function main() {
  // ignorar flags (--uri=...) ao ler o id opcional do profissional
  const onlyId = process.argv.slice(2).find((a) => !a.startsWith('--'));

  const uri = loadMongoUri();
  await mongoose.connect(uri);

  console.log('\n' + '═'.repeat(64));
  console.log('  CHI SUBLIME — Diagnóstico de horário (só leitura)');
  console.log('═'.repeat(64));
  console.log(`  Ligado a: ${describeUri(uri)}`);

  const salonBad = await checkSalon();
  const staffBad = await checkStaff(onlyId);
  await checkOverrides();

  console.log('\n' + '═'.repeat(64));
  if (salonBad === 0 && staffBad === 0) {
    console.log('  ✅ Base de dados alinhada com SALON_HOURS.');
  } else {
    console.log(`  ❌ ${salonBad} dia(s) do salão e ${staffBad} dia(s) de staff desalinhados.`);
    console.log('     Corrigir com: npx tsx scripts/fix-salon-hours.ts --dry-run');
  }
  console.log('═'.repeat(64) + '\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Diagnóstico falhou:', err);
  process.exit(1);
});
