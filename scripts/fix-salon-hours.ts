// 📄 scripts/fix-salon-hours.ts
/**
 * Chi Sublime — Migração: alinhar a BD com o horário do salão
 * ============================================================
 *
 * PORQUÊ ESTE SCRIPT EXISTE
 * -------------------------
 * Corrigir o horário no código NÃO corrige as reservas. O motor de
 * disponibilidade lê a base de dados em dois sítios e faz a
 * INTERSEÇÃO dos dois:
 *
 *   1. Schedule (type='regular')  → horário do SALÃO
 *   2. Staff.workingHours          → horário de CADA profissional
 *
 * Se o salão passar a abrir ao sábado mas os profissionais tiverem
 * `saturday.enabled = false` gravado, o site continua a mostrar
 * ZERO slots ao sábado. Este script trata dos dois de uma vez.
 *
 * O QUE FAZ
 * ---------
 *   1. Reescreve os 7 documentos Schedule type='regular' a partir
 *      de SALON_HOURS (idempotente).
 *   2. Alinha Staff.workingHours de TODOS os profissionais com o
 *      horário do salão, preservando as pausas (breaks) de cada um.
 *   3. AUDITA as reservas futuras e lista as que passam a cair fora
 *      do horário novo. NÃO cancela nada — decisão do Jean Pierre.
 *
 * O QUE NÃO FAZ
 * -------------
 *   - Não toca em feriados nem em exceções (type='holiday'/'exception').
 *   - Não cancela, move nem notifica reservas.
 *
 * USO
 * ---
 *   npx tsx scripts/fix-salon-hours.ts --dry-run   # só mostra o plano
 *   npx tsx scripts/fix-salon-hours.ts             # aplica
 *   npx tsx scripts/fix-salon-hours.ts --keep-staff  # só o salão
 *
 * ⚠️ Correr o --dry-run PRIMEIRO, em produção. E fazer snapshot do
 * Atlas antes de aplicar.
 *
 * Requer MONGODB_URI no ambiente ou em .env.local.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { Schedule } from '../src/lib/models/Schedule';
import { Staff, WEEKDAYS, type WeekDay } from '../src/lib/models/Staff';
import { Booking } from '../src/lib/models/Booking';
import {
  SALON_DEFAULT_END,
  SALON_DEFAULT_START,
  SALON_HOURS,
  SALON_HOURS_BY_NAME,
  SALON_TIMEZONE,
  type WeekDayIndex,
} from '../src/lib/constants/business';

// ------------------------------------------------------------
// Flags
// ------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_STAFF = process.argv.includes('--keep-staff');

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

/** WeekDay (nome) → índice 0-6 */
const NAME_TO_INDEX: Record<WeekDay, WeekDayIndex> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ------------------------------------------------------------
// MONGODB_URI (.env.local se não estiver no ambiente)
// ------------------------------------------------------------

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
    // .env.local não existe — cai no erro abaixo
  }

  console.error('❌ MONGODB_URI não encontrado (ambiente ou .env.local)');
  process.exit(1);
}

// ------------------------------------------------------------
// Helpers de tempo (no fuso do salão, nunca UTC)
// ------------------------------------------------------------

/** Devolve { dayOfWeek, minutes } de uma Date, lidos em Europe/Lisbon */
function readInSalonTz(date: Date): { dayOfWeek: WeekDayIndex; minutes: number; label: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIMEZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';

  const shortToIndex: Record<string, WeekDayIndex> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const hour = parseInt(get('hour'), 10) % 24;
  const minute = parseInt(get('minute'), 10);

  return {
    dayOfWeek: shortToIndex[get('weekday')] ?? 0,
    minutes: hour * 60 + minute,
    label: `${get('day')}/${get('month')}/${get('year')} ${String(hour).padStart(2, '0')}:${get('minute')}`,
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

// ------------------------------------------------------------
// PASSO 1 — Horário do salão (Schedule type='regular')
// ------------------------------------------------------------

async function fixSalonSchedule() {
  console.log('\n📅 PASSO 1 — Horário do salão (Schedule)');
  console.log('─'.repeat(56));

  for (const dayOfWeek of WEEK_ORDER) {
    const hours = SALON_HOURS[dayOfWeek];
    const label = DAY_LABELS[dayOfWeek];

    const existing = await Schedule.findOne({ type: 'regular', dayOfWeek });
    const before = existing
      ? existing.open
        ? `${existing.start} – ${existing.end}`
        : 'Encerrado'
      : '(não existe)';
    const after = hours.open ? `${hours.start} – ${hours.end}` : 'Encerrado';
    const changed = before !== after;

    console.log(
      `  ${label.padEnd(8)} ${before.padEnd(15)} → ${after.padEnd(15)} ${changed ? '✏️' : '·'}`,
    );

    if (DRY_RUN) continue;

    const doc = existing ?? new Schedule({ type: 'regular', dayOfWeek, open: false, breaks: [] });
    doc.open = hours.open;
    doc.start = hours.open ? hours.start : undefined;
    doc.end = hours.open ? hours.end : undefined;
    doc.set('breaks', []);
    await doc.save();
  }
}

// ------------------------------------------------------------
// PASSO 2 — Horário dos profissionais (Staff.workingHours)
// ------------------------------------------------------------

async function fixStaffHours() {
  console.log('\n👥 PASSO 2 — Horário dos profissionais (Staff.workingHours)');
  console.log('─'.repeat(56));

  if (KEEP_STAFF) {
    console.log('  ⏭️  --keep-staff: profissionais não alterados.');
    console.log('  ⚠️  Se algum tiver o dia desativado, esse dia fica SEM slots.');
    return;
  }

  const allStaff = await Staff.find({});
  if (allStaff.length === 0) {
    console.log('  (nenhum profissional na base de dados)');
    return;
  }

  for (const staff of allStaff) {
    const changes: string[] = [];

    for (const day of WEEKDAYS) {
      const salon = SALON_HOURS_BY_NAME[day];
      const current = staff.workingHours?.[day];

      const nextDay = {
        enabled: salon.open,
        start: salon.open ? salon.start : SALON_DEFAULT_START,
        end: salon.open ? salon.end : SALON_DEFAULT_END,
        // Pausas de cada profissional são preservadas
        breaks: current?.breaks ?? [],
      };

      const wasEnabled = Boolean(current?.enabled);
      if (
        wasEnabled !== nextDay.enabled ||
        current?.start !== nextDay.start ||
        current?.end !== nextDay.end
      ) {
        const before = wasEnabled ? `${current?.start}–${current?.end}` : 'off';
        const after = nextDay.enabled ? `${nextDay.start}–${nextDay.end}` : 'off';
        changes.push(`${DAY_LABELS[NAME_TO_INDEX[day]].slice(0, 3)} ${before}→${after}`);
      }

      staff.set(`workingHours.${day}`, nextDay);
    }

    console.log(
      `  ${staff.name.padEnd(18)} ${changes.length ? changes.join(', ') : '· sem alterações'}`,
    );

    if (!DRY_RUN && changes.length > 0) {
      staff.markModified('workingHours');
      await staff.save();
    }
  }

  console.log(
    '\n  ℹ️  As pausas (breaks) individuais foram preservadas. Se algum\n' +
      '     profissional tiver horário próprio (ex.: só de manhã), reconfigurar\n' +
      '     em /admin/equipa depois de correr isto.',
  );
}

// ------------------------------------------------------------
// PASSO 3 — Auditar reservas futuras fora do horário novo
// ------------------------------------------------------------

async function auditFutureBookings() {
  console.log('\n🔎 PASSO 3 — Reservas futuras fora do horário novo');
  console.log('─'.repeat(56));

  const bookings = await Booking.find({
    startTime: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] },
  })
    .sort({ startTime: 1 })
    .lean();

  const offending: string[] = [];

  for (const b of bookings) {
    const start = readInSalonTz(new Date(b.startTime));
    const end = readInSalonTz(new Date(b.endTime));
    const hours = SALON_HOURS[start.dayOfWeek];

    let reason: string | null = null;

    if (!hours.open) {
      reason = `${DAY_LABELS[start.dayOfWeek]} passou a ser dia de encerramento`;
    } else if (start.minutes < toMinutes(hours.start)) {
      reason = `começa antes da abertura (${hours.start})`;
    } else if (end.minutes > toMinutes(hours.end)) {
      reason = `termina depois do fecho (${hours.end})`;
    }

    if (reason) {
      offending.push(`  ⚠️  ${start.label}  #${String(b._id).slice(-6)}  ${reason}`);
    }
  }

  console.log(`  ${bookings.length} reservas futuras analisadas.`);

  if (offending.length === 0) {
    console.log('  ✅ Nenhuma reserva futura fica fora do horário novo.');
    return;
  }

  console.log(`\n  ${offending.length} reserva(s) precisam de decisão do salão:\n`);
  offending.forEach((line) => console.log(line));
  console.log(
    '\n  ℹ️  NADA foi cancelado. Estas reservas continuam válidas e visíveis\n' +
      '     na agenda — o horário só condiciona NOVAS marcações. Contactar\n' +
      '     os clientes e reagendar em /admin/agenda, se for esse o caso.',
  );
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

async function main() {
  const uri = loadMongoUri();
  await mongoose.connect(uri);

  console.log('\n' + '═'.repeat(56));
  console.log('  CHI SUBLIME — Alinhamento de horário');
  console.log('═'.repeat(56));
  console.log(`  Ligado a: ${describeUri(uri)}`);
  console.log(`  Modo: ${DRY_RUN ? '🧪 DRY RUN (nada é gravado)' : '💾 APLICAR'}`);
  console.log('  ⚠️  Confirme a base ACIMA antes de continuar.');
  console.log('  Horário alvo:');
  for (const d of WEEK_ORDER) {
    const h = SALON_HOURS[d];
    console.log(`    ${DAY_LABELS[d].padEnd(8)} ${h.open ? `${h.start} – ${h.end}` : 'Encerrado'}`);
  }

  await fixSalonSchedule();
  await fixStaffHours();
  await auditFutureBookings();

  console.log('\n' + '═'.repeat(56));
  if (DRY_RUN) {
    console.log('  🧪 DRY RUN terminado — nada foi gravado.');
    console.log('     Correr sem --dry-run para aplicar.');
  } else {
    console.log('  ✅ Horário alinhado (salão + profissionais).');
    console.log('     Verificar em /admin/horarios e /admin/equipa.');
  }
  console.log('═'.repeat(56) + '\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Migração falhou:', err);
  process.exit(1);
});
