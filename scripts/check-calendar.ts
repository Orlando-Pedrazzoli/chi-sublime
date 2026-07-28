// 📄 scripts/check-calendar.ts
/**
 * Chi Sublime — Diagnóstico do CALENDÁRIO (SÓ LEITURA)
 * ============================================================
 *
 * Corre exatamente o mesmo código que o calendário de
 * /reservar/horario usa (getMonthAvailability) e imprime o
 * estado de cada dia. Não grava nada.
 *
 * PARA QUE SERVE
 * --------------
 * O check-hours.ts confirma que a BASE DE DADOS está certa.
 * Este confirma o que a APLICAÇÃO conclui a partir dela — que
 * é outra coisa. Se aqui os sábados aparecerem 'available' mas
 * o site em produção disser indisponível, então o problema não
 * é de dados nem de lógica: é de ambiente (a Vercel está a ler
 * outra base de dados, ou o deploy ainda não apanhou o código).
 *
 * Mostra também a RAZÃO de cada dia fechado, o que distingue
 * "encerrado por horário" de "feriado" de "sem profissional".
 *
 * USO
 * ---
 *   npx tsx scripts/check-calendar.ts
 *   npx tsx scripts/check-calendar.ts 2026-08     # outro mês
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Service, Staff } from '../src/lib/models';
import { getMonthAvailability } from '../src/lib/booking/month-availability';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Símbolo por estado, para o output ser legível de relance */
const STATE_ICON: Record<string, string> = {
  available: '✅',
  full: '🟠',
  closed: '⬛',
  'staff-off': '❌',
  past: '·',
  'out-of-range': '·',
};

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

/**
 * Mostra a que base de dados nos ligámos, SEM revelar a password.
 * É o dado mais importante deste script: se não bater certo com a
 * variável de produção da Vercel, encontrámos a causa.
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

async function main() {
  const uri = loadMongoUri();
  await mongoose.connect(uri);

  const now = new Date();
  const arg = process.argv[2];
  const year = arg ? Number(arg.split('-')[0]) : now.getFullYear();
  const month = arg ? Number(arg.split('-')[1]) : now.getMonth() + 1;

  console.log('\n' + '═'.repeat(64));
  console.log('  CHI SUBLIME — Diagnóstico do calendário de reservas');
  console.log('═'.repeat(64));
  console.log(`  Ligado a: ${describeUri(uri)}`);
  console.log('  ⚠️  Confirme que bate certo com o MONGODB_URI de');
  console.log('     PRODUÇÃO na Vercel (Settings → Environment Variables)');

  // Serviço e staff de referência — o calendário precisa de ambos
  const service = await Service.findOne({ active: true }).lean();
  if (!service) {
    console.error('\n❌ Nenhum serviço ativo. O calendário não consegue calcular nada.');
    await mongoose.disconnect();
    return;
  }

  const staffCount = await Staff.countDocuments({ active: true });
  // service.name é { pt, en } — extrair o PT para o log
  const serviceName =
    typeof service.name === 'string' ? service.name : (service.name?.pt ?? '(sem nome)');
  console.log(`\n  Serviço usado no teste: ${serviceName} (${service.duration} min)`);
  console.log(`  Profissionais ativos: ${staffCount}`);
  console.log(`  Mês: ${year}-${String(month).padStart(2, '0')}  ·  staffId: any`);

  const result = await getMonthAvailability({
    year,
    month,
    serviceIds: [String(service._id)],
    staffId: 'any',
  });

  if (result.error) {
    console.error(`\n❌ ${result.error.code}: ${result.error.message}`);
    await mongoose.disconnect();
    return;
  }

  console.log('\n  Data         Dia   Estado         Detalhe');
  console.log('  ' + '─'.repeat(60));

  for (const day of result.days) {
    if (day.state === 'past') continue;

    const d = new Date(`${day.date}T12:00:00`);
    const icon = STATE_ICON[day.state] ?? '?';
    const extra = day.state === 'available' ? `${day.slotsCount} slots livres` : (day.reason ?? '');

    console.log(
      `  ${day.date}   ${DAY_LABELS[d.getDay()]}   ${icon} ${day.state.padEnd(12)} ${extra}`,
    );
  }

  // ── Resumo focado nos sábados ────────────────────────────
  const saturdays = result.days.filter((day) => {
    const d = new Date(`${day.date}T12:00:00`);
    return d.getDay() === 6 && day.state !== 'past';
  });

  console.log('\n  ' + '─'.repeat(60));
  console.log('  SÁBADOS (o dia que passou a estar aberto):');
  // 'closed' por FERIADO e 'out-of-range' sao comportamento CORRETO —
  // nao contam como problema, so como informacao.
  const isExpected = (s: (typeof saturdays)[number]) =>
    s.state === 'available' ||
    s.state === 'full' ||
    s.state === 'out-of-range' ||
    (s.state === 'closed' && Boolean(s.reason) && !s.reason!.includes('dia da semana'));

  for (const s of saturdays) {
    const mark =
      s.state === 'available' || s.state === 'full' ? '✅' : isExpected(s) ? 'ℹ️ ' : '❌';
    console.log(`    ${s.date}  ${s.state.padEnd(13)} ${mark} ${s.reason ?? ''}`);
  }

  const bad = saturdays.filter((s) => !isExpected(s));

  console.log('\n' + '═'.repeat(64));
  if (bad.length === 0 && saturdays.length > 0) {
    console.log('  ✅ Os sábados estão reserváveis NESTA base de dados.');
    console.log('     Se o site em produção discordar, o problema é de');
    console.log('     ambiente: a Vercel lê outra BD ou outro deploy.');
  } else if (saturdays.length === 0) {
    console.log('  ℹ️  Não há sábados futuros neste mês — experimente o mês seguinte.');
  } else {
    console.log(`  ❌ ${bad.length} sábado(s) indevidamente fechado(s). Ver acima.`);
  }
  console.log('═'.repeat(64) + '\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Diagnóstico falhou:', err);
  process.exit(1);
});
