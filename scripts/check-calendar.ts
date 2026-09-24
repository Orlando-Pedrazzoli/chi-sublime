// ðŸ“„ scripts/check-calendar.ts
/**
 * Chi Sublime â€” DiagnÃ³stico do CALENDÃRIO (SÃ“ LEITURA)
 * ============================================================
 *
 * Corre exatamente o mesmo cÃ³digo que o calendÃ¡rio de
 * /marcacoes/horario usa (getMonthAvailability) e imprime o
 * estado de cada dia. NÃ£o grava nada.
 *
 * PARA QUE SERVE
 * --------------
 * O check-hours.ts confirma que a BASE DE DADOS estÃ¡ certa.
 * Este confirma o que a APLICAÃ‡ÃƒO conclui a partir dela â€” que
 * Ã© outra coisa. Se aqui os sÃ¡bados aparecerem 'available' mas
 * o site em produÃ§Ã£o disser indisponÃ­vel, entÃ£o o problema nÃ£o
 * Ã© de dados nem de lÃ³gica: Ã© de ambiente (a Vercel estÃ¡ a ler
 * outra base de dados, ou o deploy ainda nÃ£o apanhou o cÃ³digo).
 *
 * Mostra tambÃ©m a RAZÃƒO de cada dia fechado, o que distingue
 * "encerrado por horÃ¡rio" de "feriado" de "sem profissional".
 *
 * USO
 * ---
 *   npx tsx scripts/check-calendar.ts
 *   npx tsx scripts/check-calendar.ts 2026-08     # outro mÃªs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Service, Staff } from '../src/lib/models';
import { getMonthAvailability } from '../src/lib/booking/month-availability';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'];

/** SÃ­mbolo por estado, para o output ser legÃ­vel de relance */
const STATE_ICON: Record<string, string> = {
  available: 'âœ…',
  full: 'ðŸŸ ',
  closed: 'â¬›',
  'staff-off': 'âŒ',
  past: 'Â·',
  'out-of-range': 'Â·',
};

function loadMongoUri(): string {
  // 1) --uri=... na linha de comandos (o mais fiÃ¡vel: nÃ£o depende
  //    da sessÃ£o do terminal nem de variÃ¡veis de ambiente)
  const uriArg = process.argv.find((a) => a.startsWith('--uri='));
  if (uriArg) return uriArg.slice('--uri='.length);

  // 2) variÃ¡vel de ambiente
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^MONGODB_URI\s*=\s*(.+)\s*$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env.local nÃ£o existe
  }

  console.error('âŒ MONGODB_URI nÃ£o encontrado (ambiente ou .env.local)');
  process.exit(1);
}

/**
 * Mostra a que base de dados nos ligÃ¡mos, SEM revelar a password.
 * Ã‰ o dado mais importante deste script: se nÃ£o bater certo com a
 * variÃ¡vel de produÃ§Ã£o da Vercel, encontrÃ¡mos a causa.
 */
function describeUri(uri: string): string {
  try {
    const withoutCreds = uri.replace(/\/\/[^@]+@/, '//<credenciais>@');
    const dbName = uri.split('/').pop()?.split('?')[0] ?? '?';
    const host = withoutCreds.match(/@([^/]+)/)?.[1] ?? '?';
    return `host=${host}  db=${dbName}`;
  } catch {
    return '(nÃ£o foi possÃ­vel interpretar o URI)';
  }
}

async function main() {
  const uri = loadMongoUri();
  await mongoose.connect(uri);

  const now = new Date();
  const arg = process.argv[2];
  const year = arg ? Number(arg.split('-')[0]) : now.getFullYear();
  const month = arg ? Number(arg.split('-')[1]) : now.getMonth() + 1;

  console.log('\n' + 'â•'.repeat(64));
  console.log('  CHI SUBLIME â€” DiagnÃ³stico do calendÃ¡rio de reservas');
  console.log('â•'.repeat(64));
  console.log(`  Ligado a: ${describeUri(uri)}`);
  console.log('  âš ï¸  Confirme que bate certo com o MONGODB_URI de');
  console.log('     PRODUÃ‡ÃƒO na Vercel (Settings â†’ Environment Variables)');

  // ServiÃ§o e staff de referÃªncia â€” o calendÃ¡rio precisa de ambos
  const service = await Service.findOne({ active: true }).lean();
  if (!service) {
    console.error('\nâŒ Nenhum serviÃ§o ativo. O calendÃ¡rio nÃ£o consegue calcular nada.');
    await mongoose.disconnect();
    return;
  }

  const staffCount = await Staff.countDocuments({ active: true });
  // service.name Ã© { pt, en } â€” extrair o PT para o log
  const serviceName =
    typeof service.name === 'string' ? service.name : (service.name?.pt ?? '(sem nome)');
  console.log(`\n  ServiÃ§o usado no teste: ${serviceName} (${service.duration} min)`);
  console.log(`  Profissionais ativos: ${staffCount}`);
  console.log(`  MÃªs: ${year}-${String(month).padStart(2, '0')}  Â·  staffId: any`);

  const result = await getMonthAvailability({
    year,
    month,
    serviceIds: [String(service._id)],
    staffId: 'any',
  });

  if (result.error) {
    console.error(`\nâŒ ${result.error.code}: ${result.error.message}`);
    await mongoose.disconnect();
    return;
  }

  console.log('\n  Data         Dia   Estado         Detalhe');
  console.log('  ' + 'â”€'.repeat(60));

  for (const day of result.days) {
    if (day.state === 'past') continue;

    const d = new Date(`${day.date}T12:00:00`);
    const icon = STATE_ICON[day.state] ?? '?';
    const extra = day.state === 'available' ? `${day.slotsCount} slots livres` : (day.reason ?? '');

    console.log(
      `  ${day.date}   ${DAY_LABELS[d.getDay()]}   ${icon} ${day.state.padEnd(12)} ${extra}`,
    );
  }

  // â”€â”€ Resumo focado nos sÃ¡bados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saturdays = result.days.filter((day) => {
    const d = new Date(`${day.date}T12:00:00`);
    return d.getDay() === 6 && day.state !== 'past';
  });

  console.log('\n  ' + 'â”€'.repeat(60));
  console.log('  SÃBADOS (o dia que passou a estar aberto):');
  // 'closed' por FERIADO e 'out-of-range' sao comportamento CORRETO â€”
  // nao contam como problema, so como informacao.
  const isExpected = (s: (typeof saturdays)[number]) =>
    s.state === 'available' ||
    s.state === 'full' ||
    s.state === 'out-of-range' ||
    (s.state === 'closed' && Boolean(s.reason) && !s.reason!.includes('dia da semana'));

  for (const s of saturdays) {
    const mark =
      s.state === 'available' || s.state === 'full' ? 'âœ…' : isExpected(s) ? 'â„¹ï¸ ' : 'âŒ';
    console.log(`    ${s.date}  ${s.state.padEnd(13)} ${mark} ${s.reason ?? ''}`);
  }

  const bad = saturdays.filter((s) => !isExpected(s));

  console.log('\n' + 'â•'.repeat(64));
  if (bad.length === 0 && saturdays.length > 0) {
    console.log('  âœ… Os sÃ¡bados estÃ£o reservÃ¡veis NESTA base de dados.');
    console.log('     Se o site em produÃ§Ã£o discordar, o problema Ã© de');
    console.log('     ambiente: a Vercel lÃª outra BD ou outro deploy.');
  } else if (saturdays.length === 0) {
    console.log('  â„¹ï¸  NÃ£o hÃ¡ sÃ¡bados futuros neste mÃªs â€” experimente o mÃªs seguinte.');
  } else {
    console.log(`  âŒ ${bad.length} sÃ¡bado(s) indevidamente fechado(s). Ver acima.`);
  }
  console.log('â•'.repeat(64) + '\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('âŒ DiagnÃ³stico falhou:', err);
  process.exit(1);
});
