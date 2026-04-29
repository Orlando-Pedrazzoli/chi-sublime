/**
 * Chi Sublime — Test Availability Algorithm
 * ============================================================
 *
 * Script standalone que valida o algoritmo de availability com 14 cenarios reais.
 *
 * Como correr:
 *   npx tsx scripts/test-availability.ts
 *
 * Resultado: tabela com PASS/FAIL para cada cenario.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { Booking, Category, Service, Staff, Schedule } from '../src/lib/models';
import { getAvailableSlots } from '../src/lib/booking/availability';

// ============================================================
// Helpers
// ============================================================

const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  pass: (msg: string) => console.log(`✅ ${msg}`),
  fail: (msg: string) => console.log(`❌ ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  divider: () => console.log('─'.repeat(60)),
};

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): boolean {
  if (condition) {
    log.pass(message);
    passCount++;
  } else {
    log.fail(message);
    failCount++;
  }
  return condition;
}

/** Cria uma data num dia da semana especifico nas proximas semanas */
function getNextWeekday(targetWeekday: number, weeksAhead = 1): Date {
  const date = new Date();
  const currentDay = date.getDay();
  const daysUntilTarget = (targetWeekday - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilTarget + (weeksAhead - 1) * 7);
  date.setHours(12, 0, 0, 0); // meio-dia para evitar issues TZ
  return date;
}

// ============================================================
// CENARIOS
// ============================================================

async function runScenario1_NormalDay() {
  log.divider();
  log.info('CENARIO 1 — Dia normal sem reservas (quinta-feira)');

  const services = await Service.find({ active: true }).sort({ duration: 1 }).limit(1).lean();
  const staff = await Staff.findOne({ slug: 'jean-pierre' }).lean();

  if (!services.length || !staff) {
    log.warn('Database vazia — corre seed primeiro');
    return;
  }

  const thursday = getNextWeekday(4, 2); // Quinta-feira da prox semana

  const result = await getAvailableSlots({
    date: thursday,
    serviceIds: [String(services[0]._id)],
    staffId: String(staff._id),
  });

  assert(result.metadata.salonOpen, 'Salao aberto');
  assert(result.slots.length > 0, `Slots disponiveis (${result.slots.length})`);
  assert(
    result.slots[0].time === '10:00' || result.slots[0].time === '10:30',
    `Primeiro slot e ${result.slots[0]?.time} (esperado ~10:00)`,
  );
}

async function runScenario2_Saturday() {
  log.divider();
  log.info('CENARIO 2 — Sabado (salao fechado)');

  const services = await Service.find({ active: true }).limit(1).lean();
  if (!services.length) return;

  const saturday = getNextWeekday(6, 1);
  const result = await getAvailableSlots({
    date: saturday,
    serviceIds: [String(services[0]._id)],
    staffId: 'any',
  });

  assert(!result.metadata.salonOpen, 'Salao fechado');
  assert(result.slots.length === 0, 'Zero slots devolvidos');
  assert(result.metadata.closedReason === 'closed', `Razao = "closed"`);
}

async function runScenario3_Holiday() {
  log.divider();
  log.info('CENARIO 3 — Feriado nacional (1 maio)');

  const services = await Service.find({ active: true }).limit(1).lean();
  if (!services.length) return;

  // 1 de maio do proximo ano (recurringYearly)
  const today = new Date();
  const targetYear = today.getMonth() < 4 ? today.getFullYear() : today.getFullYear() + 1;
  const mayDay = new Date(targetYear, 4, 1, 12, 0, 0);

  // Verificar se esta dentro de 30 dias
  const diffDays = Math.floor((mayDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    log.warn(`1 de Maio esta a ${diffDays} dias — fora do limite de 30 dias`);
    log.warn('Cenario nao testavel hoje, mas algoritmo suporta');
    return;
  }

  const result = await getAvailableSlots({
    date: mayDay,
    serviceIds: [String(services[0]._id)],
    staffId: 'any',
  });

  assert(!result.metadata.salonOpen, 'Salao fechado em feriado');
  assert(result.slots.length === 0, 'Zero slots devolvidos');
  assert(
    result.metadata.closedReason === 'holiday',
    `Razao = "holiday" (recebido: ${result.metadata.closedReason})`,
  );
  assert(
    result.metadata.closedReasonDetail !== undefined,
    `Detalhe presente: "${result.metadata.closedReasonDetail}"`,
  );
}

async function runScenario4_TooFar() {
  log.divider();
  log.info('CENARIO 4 — Mais de 30 dias futuro (deve dar erro)');

  const services = await Service.find({ active: true }).limit(1).lean();
  if (!services.length) return;

  const farDate = new Date();
  farDate.setDate(farDate.getDate() + 60); // 60 dias futuro

  const result = await getAvailableSlots({
    date: farDate,
    serviceIds: [String(services[0]._id)],
    staffId: 'any',
  });

  assert(result.error?.code === 'too-far', "Erro 'too-far' devolvido");
}

async function runScenario5_Past() {
  log.divider();
  log.info('CENARIO 5 — Data no passado (deve dar erro)');

  const services = await Service.find({ active: true }).limit(1).lean();
  if (!services.length) return;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);

  const result = await getAvailableSlots({
    date: pastDate,
    serviceIds: [String(services[0]._id)],
    staffId: 'any',
  });

  assert(result.error?.code === 'no-past', "Erro 'no-past' devolvido");
}

async function runScenario6_AnyStaff() {
  log.divider();
  log.info("CENARIO 6 — 'Qualquer staff' (load balancing)");

  // Manicure - todos podem fazer? Verificar
  const manicureService = await Service.findOne({
    'name.pt': /Manicure/i,
    active: true,
  }).lean();

  if (!manicureService) {
    log.warn('Servico Manicure nao encontrado');
    return;
  }

  const thursday = getNextWeekday(4, 2);

  const result = await getAvailableSlots({
    date: thursday,
    serviceIds: [String(manicureService._id)],
    staffId: 'any',
  });

  assert(result.metadata.salonOpen, 'Salao aberto');
  assert(result.slots.length > 0, `Slots devolvidos (${result.slots.length})`);
  assert(
    result.metadata.candidateStaffIds.length > 0,
    `Candidate staff: ${result.metadata.candidateStaffIds.length}`,
  );
  assert(
    result.slots[0].staffId !== undefined,
    `Primeiro slot tem staff atribuido: ${result.slots[0].staffName}`,
  );
}

async function runScenario7_MultipleServices() {
  log.divider();
  log.info('CENARIO 7 — Multiplos servicos (Corte + Coloracao)');

  const corte = await Service.findOne({
    'name.pt': /Corte Feminino/i,
    active: true,
  }).lean();
  const coloracao = await Service.findOne({
    'name.pt': /Coloracao|Coloração/i,
    active: true,
  }).lean();

  if (!corte || !coloracao) {
    log.warn('Servicos Corte ou Coloracao nao encontrados');
    return;
  }

  const expectedDuration = corte.duration + corte.bufferAfter + coloracao.duration;
  log.info(
    `  Duracao esperada: ${corte.duration} + ${corte.bufferAfter} buffer + ${coloracao.duration} = ${expectedDuration}min`,
  );

  const thursday = getNextWeekday(4, 2);
  const result = await getAvailableSlots({
    date: thursday,
    serviceIds: [String(corte._id), String(coloracao._id)],
    staffId: 'any',
  });

  assert(
    result.metadata.totalDurationMinutes === expectedDuration,
    `totalDuration = ${result.metadata.totalDurationMinutes}min`,
  );
  assert(result.slots.length > 0, `Slots devolvidos (${result.slots.length})`);
}

async function runScenario8_SkillFiltering() {
  log.divider();
  log.info('CENARIO 8 — Skill-based filtering');

  // Verificar quantos staff nao tem restricao
  const staffCount = await Staff.countDocuments({ active: true });
  const services = await Service.find({ active: true }).limit(1).lean();
  if (!services.length) return;

  const thursday = getNextWeekday(4, 2);
  const result = await getAvailableSlots({
    date: thursday,
    serviceIds: [String(services[0]._id)],
    staffId: 'any',
  });

  // Todos os servicos no seed tem staffIds=[] (sem restricao),
  // entao todos os staff devem ser candidatos
  assert(
    result.metadata.candidateStaffIds.length === staffCount,
    `Todos os ${staffCount} staff sao candidatos (recebido ${result.metadata.candidateStaffIds.length})`,
  );
}

async function runScenario9_TimeUtils() {
  log.divider();
  log.info('CENARIO 9 — Helpers de tempo');

  const { timeToMinutes, minutesToTime, roundUpToInterval, timeRangesOverlap } =
    await import('../src/lib/utils/time-utils');

  assert(timeToMinutes('10:00') === 600, "timeToMinutes('10:00') = 600");
  assert(timeToMinutes('13:30') === 810, "timeToMinutes('13:30') = 810");
  assert(minutesToTime(600) === '10:00', "minutesToTime(600) = '10:00'");
  assert(minutesToTime(810) === '13:30', "minutesToTime(810) = '13:30'");
  assert(roundUpToInterval(841, 30) === 870, 'roundUpToInterval(841, 30) = 870');
  assert(roundUpToInterval(840, 30) === 840, 'roundUpToInterval(840, 30) = 840 (ja multiplo)');
  assert(
    timeRangesOverlap('10:00', '11:00', '10:30', '11:30') === true,
    'Ranges 10-11 e 10:30-11:30 sobrepoem',
  );
  assert(
    timeRangesOverlap('10:00', '11:00', '11:00', '12:00') === false,
    'Ranges 10-11 e 11-12 NAO sobrepoem (toque)',
  );
}

async function runScenario10_NoServices() {
  log.divider();
  log.info('CENARIO 10 — Erro: nenhum servico escolhido');

  const thursday = getNextWeekday(4, 2);
  const result = await getAvailableSlots({
    date: thursday,
    serviceIds: [],
    staffId: 'any',
  });

  assert(result.error?.code === 'invalid-services', "Erro 'invalid-services'");
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI nao definida');
    process.exit(1);
  }

  log.info('A conectar a MongoDB Atlas...');
  await mongoose.connect(uri);
  log.info(`Conectado a ${mongoose.connection.name}`);

  // Verificar se ha dados
  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    console.error('\n⚠️  Database vazia. Corre `npx tsx scripts/seed-database.ts` primeiro.');
    process.exit(1);
  }

  console.log('\n🧪 A correr testes do algoritmo de availability...\n');

  await runScenario1_NormalDay();
  await runScenario2_Saturday();
  await runScenario3_Holiday();
  await runScenario4_TooFar();
  await runScenario5_Past();
  await runScenario6_AnyStaff();
  await runScenario7_MultipleServices();
  await runScenario8_SkillFiltering();
  await runScenario9_TimeUtils();
  await runScenario10_NoServices();

  log.divider();
  console.log(`\n📊 Resultado final: ${passCount} PASS / ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 Todos os testes passaram!\n');
  } else {
    console.log('⚠️  Alguns testes falharam. Revisa os outputs acima.\n');
  }

  await mongoose.disconnect();
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
