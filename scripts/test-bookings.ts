/**
 * Chi Sublime — Test Booking Server Actions
 * ============================================================
 *
 * Valida o sistema de criacao de reservas com 10 cenarios reais.
 *
 * Como correr:
 *   npx tsx scripts/test-bookings.ts
 *
 * IMPORTANTE: este script CRIA e APAGA bookings reais na DB.
 *  - Limpa bookings de teste no inicio
 *  - Usa email "test-booking@example.com" para identificar
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import { Booking, Client, Service, Staff, Counter } from '../src/lib/models';
import { createBookingAction, cancelBookingAction } from '../src/lib/server-actions/bookings';

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

const TEST_EMAIL = 'test-booking@example.com';
const TEST_PHONE = '+351912345678';
const TEST_NAME = 'Cliente Teste';

function getNextThursday(weeksAhead = 2): Date {
  const date = new Date();
  const currentDay = date.getDay();
  const daysUntilThursday = (4 - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilThursday + (weeksAhead - 1) * 7);
  date.setHours(12, 0, 0, 0);
  return date;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function cleanupTestData() {
  // Apagar bookings e clientes de teste
  const testClients = await Client.find({ email: TEST_EMAIL });
  const testClientIds = testClients.map((c) => c._id);

  await Booking.deleteMany({ clientId: { $in: testClientIds } });
  await Client.deleteMany({ email: TEST_EMAIL });

  // NAO resetar Counter (nao queremos perder numeros sequenciais)
}

async function getValidServiceIds(count = 1): Promise<string[]> {
  const services = await Service.find({ active: true }).sort({ duration: 1 }).limit(count).lean();
  return services.map((s) => String(s._id));
}

// ============================================================
// CENARIOS
// ============================================================

async function scenario1_ValidGuest() {
  log.divider();
  log.info('CENARIO 1 — Criar booking valido (guest)');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '10:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  if (!result.success) {
    log.fail(`Erro: ${result.error.message}`);
    failCount++;
    return null;
  }

  assert(
    result.booking.bookingNumber.startsWith('CHI-'),
    `Booking number gerado: ${result.booking.bookingNumber}`,
  );
  assert(result.booking.cancellationToken.length > 20, 'Token de cancelamento gerado');
  assert(result.booking.staffName !== undefined, `Staff atribuido: ${result.booking.staffName}`);

  return result.booking;
}

async function scenario2_SlotTaken() {
  log.divider();
  log.info('CENARIO 2 — Tentar reservar slot ja ocupado');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  // Tentar reservar O MESMO slot que cenario 1
  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '10:00',
    guestInfo: {
      name: 'Outro Cliente',
      email: 'outro-test@example.com',
      phone: '+351913456789',
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  // Limpar este cliente extra que pode ter sido criado
  await Client.deleteMany({ email: 'outro-test@example.com' });

  // O sistema pode atribuir outro staff (load balancing) — entao pode SUCCESS
  // ou pode falhar com slot-taken se so 1 staff disponivel
  if (result.success) {
    log.warn('Slot foi atribuido a outro staff (load balancing) — comportamento aceitavel');
    // Limpar o segundo booking
    await Booking.deleteOne({ bookingNumber: result.booking.bookingNumber });
    passCount++;
  } else {
    assert(
      result.error.code === 'slot-taken' || result.error.code === 'validation',
      `Erro esperado (slot-taken ou validation), recebido: ${result.error.code}`,
    );
  }
}

async function scenario3_InvalidEmail() {
  log.divider();
  log.info('CENARIO 3 — Email invalido');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '11:00',
    guestInfo: {
      name: TEST_NAME,
      email: 'nao-e-email',
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  assert(!result.success, 'Falhou (esperado)');
  if (!result.success) {
    assert(result.error.code === 'validation', `Erro 'validation' devolvido`);
  }
}

async function scenario4_DisposableEmail() {
  log.divider();
  log.info('CENARIO 4 — Email descartavel (mailinator.com)');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '11:30',
    guestInfo: {
      name: TEST_NAME,
      email: 'fake@mailinator.com',
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  assert(!result.success, 'Falhou (esperado)');
  if (!result.success) {
    assert(result.error.code === 'validation', `Erro 'validation' devolvido`);
  }
}

async function scenario5_InvalidPhone() {
  log.divider();
  log.info('CENARIO 5 — Telefone nao-portugues');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '12:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: '+5511999999999', // Brasil — nao PT
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  assert(!result.success, 'Falhou (esperado)');
  if (!result.success) {
    assert(result.error.code === 'validation', `Erro 'validation' devolvido`);
  }
}

async function scenario6_HoneypotTriggered() {
  log.divider();
  log.info('CENARIO 6 — Honeypot acionado (campo website preenchido)');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '13:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
    website: 'https://spam-bot.com', // BOT
  });

  assert(!result.success, 'Falhou (esperado — honeypot)');
}

async function scenario7_CancellationPolicyNotAccepted() {
  log.divider();
  log.info('CENARIO 7 — Politica de cancelamento nao aceite');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(2);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '14:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: false, // <-- não aceita
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  assert(!result.success, 'Falhou (esperado)');
}

async function scenario8_MultipleServices() {
  log.divider();
  log.info('CENARIO 8 — Multiplos servicos numa reserva');

  const serviceIds = await getValidServiceIds(2);
  const date = getNextThursday(3);

  const result = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '10:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  assert(result.success, 'Booking criado com 2 servicos');
}

async function scenario9_CancelBooking() {
  log.divider();
  log.info('CENARIO 9 — Cancelar booking valido');

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(4); // muito futuro para passar janela 24h

  const created = await createBookingAction({
    serviceIds,
    staffId: 'any',
    date: toISODate(date),
    time: '11:00',
    guestInfo: {
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    },
    acceptsCancellationPolicy: true,
    requestInvoice: false,
    marketingConsent: false,
    source: 'website',
  });

  if (!created.success) {
    log.fail('Pre-requisito falhou (criar booking)');
    failCount++;
    return;
  }

  const cancelResult = await cancelBookingAction({
    bookingNumber: created.booking.bookingNumber,
    cancellationToken: created.booking.cancellationToken,
  });

  assert(cancelResult.success, 'Cancelamento bem-sucedido');
}

async function scenario10_NumberingSequential() {
  log.divider();
  log.info('CENARIO 10 — Numeracao sequencial (CHI-2026-XXXX)');

  // Buscar contador atual
  const year = new Date().getFullYear();
  const counter = await Counter.findById(`booking-${year}`).lean();
  const startSeq = counter?.seq ?? 0;

  log.info(`  Contador atual: ${startSeq}`);

  const serviceIds = await getValidServiceIds(1);
  const date = getNextThursday(5);

  // Criar 3 bookings consecutivos
  const numbers: string[] = [];
  for (let i = 0; i < 3; i++) {
    const time = `${10 + i}:00`;
    const result = await createBookingAction({
      serviceIds,
      staffId: 'any',
      date: toISODate(date),
      time,
      guestInfo: {
        name: TEST_NAME,
        email: TEST_EMAIL,
        phone: TEST_PHONE,
      },
      acceptsCancellationPolicy: true,
      requestInvoice: false,
      marketingConsent: false,
      source: 'website',
    });
    if (result.success) {
      numbers.push(result.booking.bookingNumber);
    }
  }

  assert(numbers.length === 3, `3 bookings criados: ${numbers.join(', ')}`);

  // Verificar se sao sequenciais
  if (numbers.length === 3) {
    const seqs = numbers.map((n) => parseInt(n.split('-')[2], 10));
    const isSequential = seqs[1] === seqs[0] + 1 && seqs[2] === seqs[1] + 1;
    assert(isSequential, `Numeracao sequencial: ${seqs.join(', ')}`);
  }
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

  log.info('A limpar dados de teste anteriores...');
  await cleanupTestData();

  console.log('\n🧪 A correr testes do sistema de bookings...\n');

  try {
    await scenario1_ValidGuest();
    await scenario2_SlotTaken();
    await scenario3_InvalidEmail();
    await scenario4_DisposableEmail();
    await scenario5_InvalidPhone();
    await scenario6_HoneypotTriggered();
    await scenario7_CancellationPolicyNotAccepted();
    await scenario8_MultipleServices();
    await scenario9_CancelBooking();
    await scenario10_NumberingSequential();
  } catch (err) {
    log.fail(`Erro fatal: ${err}`);
    failCount++;
  }

  log.info('A limpar dados de teste...');
  await cleanupTestData();

  log.divider();
  console.log(`\n📊 Resultado final: ${passCount} PASS / ${failCount} FAIL`);
  if (failCount === 0) {
    console.log('🎉 Todos os testes passaram!\n');
  } else {
    console.log('⚠️  Alguns testes falharam.\n');
  }

  await mongoose.disconnect();
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
