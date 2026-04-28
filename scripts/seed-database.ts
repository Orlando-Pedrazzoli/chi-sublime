/**
 * Chi Sublime — Seed Database
 * ============================================================
 *
 * Popula a database com dados iniciais reais do Chi Sublime:
 * categorias, serviços, staff, horários, conteúdo do site,
 * configuração fiscal.
 *
 * Como correr:
 *   npx tsx scripts/seed-database.ts
 *
 * AVISO: limpa as collections antes de inserir (idempotente).
 * Não correr em produção sem cuidado.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import {
  Category,
  Service,
  Staff,
  IncomeCategory,
  ExpenseCategory,
  Schedule,
  SiteContent,
  FiscalSettings,
  WEEKDAYS,
  slugify,
} from '../src/lib/models';

// ============================================================
// Helpers
// ============================================================

const log = (emoji: string, msg: string) => console.log(`${emoji} ${msg}`);
const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

async function clearCollection(name: string, model: mongoose.Model<unknown>) {
  const result = await model.deleteMany({});
  log('🧹', `${name}: ${result.deletedCount} documentos eliminados`);
}

// ============================================================
// 1. CATEGORIAS DE SERVIÇO
// ============================================================

async function seedCategories() {
  log('📂', 'A criar categorias de serviço...');

  const categories = [
    { name: { pt: 'Cabelereiro', en: 'Hair' }, slug: 'cabelereiro', color: '#1F3D2E', order: 1 },
    { name: { pt: 'Sobrancelhas', en: 'Brows' }, slug: 'sobrancelhas', color: '#D4AF6E', order: 2 },
    { name: { pt: 'Maquilhagem', en: 'Makeup' }, slug: 'maquilhagem', color: '#97C459', order: 3 },
    { name: { pt: 'Unhas', en: 'Nails' }, slug: 'unhas', color: '#5DCAA5', order: 4 },
    {
      name: { pt: 'Depilação', en: 'Hair Removal' },
      slug: 'depilacao',
      color: '#888780',
      order: 5,
    },
  ];

  const created = await Category.insertMany(categories);
  log('✅', `${created.length} categorias criadas`);
  return created;
}

// ============================================================
// 2. SERVIÇOS (preços reais do Chi Sublime — vistos nos prints)
// ============================================================

async function seedServices(categories: Awaited<ReturnType<typeof seedCategories>>) {
  log('💇', 'A criar serviços...');

  const catMap = new Map(categories.map((c) => [c.slug, c._id]));

  // ─── DEPILAÇÃO (10 serviços) ───────────────────────────────
  const depilacao = catMap.get('depilacao')!;
  const depServices = [
    { name: 'Axilas', duration: 30, price: 1200 },
    { name: 'Buço', duration: 10, price: 1000 },
    { name: 'Queixo', duration: 10, price: 1000 },
    { name: 'Braço', duration: 30, price: 1500 },
    { name: 'Orelha', duration: 15, price: 1000 },
    { name: 'Virilha Biquíni', duration: 30, price: 2000 },
    { name: 'Virilha Completa', duration: 45, price: 3500 },
    { name: 'Perna Inteira', duration: 30, price: 2500 },
    { name: 'Meia Perna', duration: 60, price: 2000 },
    { name: 'Nariz', duration: 60, price: 1000 },
  ];

  // ─── MAQUILHAGEM (2) ───────────────────────────────────────
  const maq = catMap.get('maquilhagem')!;
  const maqServices = [
    { name: 'Maquilhagem Premium', duration: 60, price: 6000 },
    { name: 'Maquilhagem Noiva', duration: 60, price: 10000, popular: true },
  ];

  // ─── SOBRANCELHAS (4) ──────────────────────────────────────
  const sobr = catMap.get('sobrancelhas')!;
  const sobrServices = [
    { name: 'Design de Sobrancelhas', duration: 30, price: 2000, popular: true },
    { name: 'Design de Sobrancelhas + Pigmentação', duration: 40, price: 4000 },
    { name: 'Brow Lamination', duration: 30, price: 4000, popular: true },
    { name: 'Limpeza Sobrancelhas', duration: 60, price: 1500 },
  ];

  // ─── CABELEREIRO (14) ──────────────────────────────────────
  const cab = catMap.get('cabelereiro')!;
  const cabServices = [
    { name: 'Escova/Brushing', duration: 60, price: 2500 },
    { name: 'Madeixas/Highlights', duration: 225, price: 15000, popular: true },
    { name: 'Coloração/Coloring', duration: 90, price: 6000 },
    { name: 'Corte Feminino', duration: 60, price: 2500, popular: true },
    { name: 'Corte Masculino', duration: 60, price: 2500 },
    { name: 'Ozonoterapia', duration: 60, price: 3000 },
    { name: 'Hidratação Mascara', duration: 60, price: 2000 },
    { name: 'Alisamento Cadivel', duration: 240, price: 15000 },
    { name: 'Trat. Capilar Cera Vegana Truss', duration: 60, price: 4000 },
    { name: 'Extensão Fio a Fio Queratina', duration: 210, price: 30000 },
    { name: 'Extensões Microlink', duration: 120, price: 15000 },
    { name: 'Tonalizante', duration: 30, price: 3000 },
    { name: 'Corte Bordado', duration: 90, price: 6000 },
    { name: 'Extensões Fita', duration: 120, price: 15000 },
  ];

  // ─── UNHAS (4) ─────────────────────────────────────────────
  const unh = catMap.get('unhas')!;
  const unhServices = [
    { name: 'Manicure Simples', duration: 45, price: 1500 },
    { name: 'Pedicure Simples', duration: 60, price: 2500 },
    { name: 'Manicure Gelinho', duration: 60, price: 2500, popular: true },
    { name: 'Pedicure Gelinho', duration: 60, price: 3000 },
  ];

  const allServices = [
    ...depServices.map((s, i) => ({ ...s, categoryId: depilacao, order: i + 1 })),
    ...maqServices.map((s, i) => ({ ...s, categoryId: maq, order: i + 1 })),
    ...sobrServices.map((s, i) => ({ ...s, categoryId: sobr, order: i + 1 })),
    ...cabServices.map((s, i) => ({ ...s, categoryId: cab, order: i + 1 })),
    ...unhServices.map((s, i) => ({ ...s, categoryId: unh, order: i + 1 })),
  ];

  // Criar com nome estruturado e slug auto-gerado
  // Gerar slug explicitamente (não depender do hook pre-save em insertMany)
  const created = await Service.insertMany(
    allServices.map((s) => ({
      ...s,
      name: { pt: s.name },
      slug: slugify(s.name),
      vatRate: 23,
      bufferAfter: 5,
      staffIds: [],
      requiresDeposit: false,
      depositAmount: 0,
      active: true,
      popular: (s as { popular?: boolean }).popular ?? false,
    })),
  );

  log('✅', `${created.length} serviços criados`);
  log(
    '💰',
    `Total catálogo: ${eur(created.reduce((sum, s) => sum + s.price, 0))} (somando 1x cada)`,
  );
  return created;
}

// ============================================================
// 3. STAFF (Jean Pierre, Matias, Ana Rita)
// ============================================================

async function seedStaff() {
  log('👥', 'A criar equipa...');

  const team = [
    {
      name: 'Jean Pierre',
      slug: 'jean-pierre',
      role: { pt: 'Founder · Hair Artist', en: 'Founder · Hair Artist' },
      specialty: { pt: 'Especialista em coloração e transformações' },
      photo: '/images/team/jean-pierre.jpg',
      specialties: ['Coloração', 'Madeixas', 'Corte feminino', 'Alisamentos'],
      order: 1,
    },
    {
      name: 'Matias',
      slug: 'matias',
      role: { pt: 'Senior Stylist', en: 'Senior Stylist' },
      specialty: { pt: 'O detalhe é onde mora a perfeição' },
      photo: '/images/team/matias.jpg',
      specialties: ['Corte masculino', 'Barba', 'Brushing'],
      order: 2,
    },
    {
      name: 'Ana Rita',
      slug: 'ana-rita',
      role: { pt: 'Beauty Specialist', en: 'Beauty Specialist' },
      specialty: { pt: 'Maquilhagem que revela quem você é' },
      photo: '/images/team/ana-rita.jpg',
      specialties: ['Maquilhagem', 'Sobrancelhas', 'Manicure', 'Brow lamination'],
      order: 3,
    },
  ];

  const created = await Staff.insertMany(team);
  log('✅', `${created.length} membros da equipa criados`);
  return created;
}

// ============================================================
// 4. CATEGORIAS DE RECEITA
// ============================================================

async function seedIncomeCategories() {
  log('💚', 'A criar categorias de receita...');

  const cats = [
    { name: 'Serviços', slug: 'servicos', color: '#1F3D2E', order: 1, isDefault: true },
    { name: 'Produtos retalho', slug: 'produtos-retalho', color: '#D4AF6E', order: 2 },
    { name: 'Vouchers / Gift Cards', slug: 'vouchers', color: '#97C459', order: 3 },
    { name: 'Outros', slug: 'outros', color: '#888780', order: 4 },
  ];

  const created = await IncomeCategory.insertMany(cats);
  log('✅', `${created.length} categorias de receita criadas`);
  return created;
}

// ============================================================
// 5. CATEGORIAS DE DESPESA
// ============================================================

async function seedExpenseCategories() {
  log('💸', 'A criar categorias de despesa...');

  const cats = [
    {
      name: 'Produtos profissionais',
      slug: 'produtos',
      color: '#B23C3C',
      isFixed: false,
      order: 1,
    },
    { name: 'Renda do espaço', slug: 'renda', color: '#C4861E', isFixed: true, order: 2 },
    { name: 'Luz / Água / Gás', slug: 'utilities', color: '#2C5F8A', isFixed: true, order: 3 },
    { name: 'Internet / Telefone', slug: 'telecom', color: '#5DCAA5', isFixed: true, order: 4 },
    { name: 'Marketing', slug: 'marketing', color: '#D4AF6E', isFixed: false, order: 5 },
    { name: 'Salários / Comissões', slug: 'salarios', color: '#1F3D2E', isFixed: true, order: 6 },
    { name: 'Impostos', slug: 'impostos', color: '#791F1F', isFixed: true, order: 7 },
    { name: 'Software / Subscrições', slug: 'software', color: '#2D7A55', isFixed: true, order: 8 },
    { name: 'Limpeza / Manutenção', slug: 'limpeza', color: '#888780', isFixed: false, order: 9 },
    { name: 'Formação', slug: 'formacao', color: '#97C459', isFixed: false, order: 10 },
    {
      name: 'Outros',
      slug: 'outros-despesa',
      color: '#5A5A5A',
      isFixed: false,
      order: 11,
      isDefault: true,
    },
  ];

  const created = await ExpenseCategory.insertMany(cats);
  log('✅', `${created.length} categorias de despesa criadas`);
  return created;
}

// ============================================================
// 6. HORÁRIO BASE + FERIADOS PORTUGUESES
// ============================================================

async function seedSchedule() {
  log('📅', 'A criar horário base e feriados...');

  // Horário regular: Seg-Sex 10h-19h, fim-de-semana fechado
  const regular = WEEKDAYS.map((day, i) => {
    const dayOfWeek = (i + 1) % 7; // monday=1, ..., sunday=0
    const isWeekend = day === 'saturday' || day === 'sunday';
    return {
      type: 'regular' as const,
      dayOfWeek,
      open: !isWeekend,
      start: '10:00',
      end: '19:00',
      breaks: [],
      recurringYearly: false,
    };
  });

  // Feriados nacionais portugueses (recorrentes)
  const year = new Date().getFullYear();
  const holidays = [
    { date: new Date(year, 0, 1), reason: 'Ano Novo' },
    { date: new Date(year, 3, 25), reason: 'Dia da Liberdade' },
    { date: new Date(year, 4, 1), reason: 'Dia do Trabalhador' },
    { date: new Date(year, 5, 10), reason: 'Dia de Portugal' },
    { date: new Date(year, 7, 15), reason: 'Assunção de Nossa Senhora' },
    { date: new Date(year, 9, 5), reason: 'Implantação da República' },
    { date: new Date(year, 10, 1), reason: 'Dia de Todos os Santos' },
    { date: new Date(year, 11, 1), reason: 'Restauração da Independência' },
    { date: new Date(year, 11, 8), reason: 'Imaculada Conceição' },
    { date: new Date(year, 11, 25), reason: 'Natal' },
  ].map((h) => ({
    type: 'holiday' as const,
    date: h.date,
    open: false,
    breaks: [],
    reason: h.reason,
    recurringYearly: true,
  }));

  await Schedule.insertMany([...regular, ...holidays]);
  log('✅', `${regular.length} horários regulares + ${holidays.length} feriados criados`);
}

// ============================================================
// 7. CONTEÚDO DO SITE (editável)
// ============================================================

async function seedSiteContent() {
  log('📝', 'A criar conteúdo do site...');

  const contents = [
    {
      key: 'home.hero',
      type: 'hero' as const,
      label: 'Hero da Homepage',
      helperText: 'O bloco principal no topo da página inicial.',
      content: {
        pt: {
          eyebrow: 'Hair Style & Beauty · Cascais',
          title: 'Beleza que respira o tempo',
          titleHighlight: 'respira',
          subtitle:
            'Um espaço de cuidado refinado em Quinta da Bicuda, onde cada gesto é pensado para revelar a sua essência.',
          ctaPrimary: 'Reservar Online',
          ctaSecondary: 'Descobrir',
        },
      },
    },
    {
      key: 'home.philosophy',
      type: 'section' as const,
      label: 'Secção Filosofia',
      content: {
        pt: {
          eyebrow: 'A nossa filosofia',
          title: 'Onde o cuidado encontra a arte.',
          titleHighlight: 'arte',
          quote:
            'Acreditamos que a verdadeira beleza vive na atenção aos pequenos detalhes — no toque, no tempo, na escuta.',
          body: 'No coração de Cascais, o Chi Sublime é mais do que um salão. É um refúgio sensorial onde cada visita é uma celebração da sua individualidade. A nossa equipa combina técnica refinada com produtos de excelência para criar experiências verdadeiramente memoráveis.',
        },
      },
    },
    {
      key: 'company.contact',
      type: 'metadata' as const,
      label: 'Dados de Contacto',
      content: {
        pt: {
          address: 'R. Estorninho, Loja E, Quinta da Bicuda',
          postalCode: '2750-686',
          city: 'Cascais',
          phone: '+351 932 932 691',
          email: 'reservas@chisublime.pt',
          instagram: 'https://www.instagram.com/chiptsublime/',
        },
      },
    },
  ];

  const created = await SiteContent.insertMany(contents);
  log('✅', `${created.length} entries de conteúdo criadas`);
}

// ============================================================
// 8. CONFIGURAÇÃO FISCAL INICIAL
// ============================================================

async function seedFiscalSettings() {
  log('🧾', 'A criar configuração fiscal...');

  await FiscalSettings.create({
    key: 'default',
    companyName: 'Chi Sublime — Hair Style & Beauty',
    tradingName: 'Chi Sublime',
    vatNumber: '000000000', // placeholder — Jean Pierre preenche depois
    address: 'R. Estorninho, Loja E, Quinta da Bicuda',
    postalCode: '2750-686',
    city: 'Cascais',
    country: 'PT',
    fiscalEmail: 'reservas@chisublime.pt',
    phone: '+351 932 932 691',
    invoiceProvider: 'mock',
    defaultVatRate: 23,
    defaultCurrency: 'EUR',
    incomePrefix: 'RX',
    expensePrefix: 'DX',
    bookingPrefix: 'CHI',
    autoSendInvoiceEmail: true,
  });

  log('✅', 'Configuração fiscal inicial criada');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI não definida no .env.local');
    process.exit(1);
  }

  log('🔌', 'A conectar a MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  log('✅', `Conectado a ${mongoose.connection.name}\n`);

  log('🧹', 'A limpar collections existentes...');
  await clearCollection('Category', Category as mongoose.Model<unknown>);
  await clearCollection('Service', Service as mongoose.Model<unknown>);
  await clearCollection('Staff', Staff as mongoose.Model<unknown>);
  await clearCollection('IncomeCategory', IncomeCategory as mongoose.Model<unknown>);
  await clearCollection('ExpenseCategory', ExpenseCategory as mongoose.Model<unknown>);
  await clearCollection('Schedule', Schedule as mongoose.Model<unknown>);
  await clearCollection('SiteContent', SiteContent as mongoose.Model<unknown>);
  await clearCollection('FiscalSettings', FiscalSettings as mongoose.Model<unknown>);
  console.log();

  // Sequência respeita dependências (categorias antes de serviços, etc.)
  const categories = await seedCategories();
  await seedServices(categories);
  await seedStaff();
  await seedIncomeCategories();
  await seedExpenseCategories();
  await seedSchedule();
  await seedSiteContent();
  await seedFiscalSettings();

  console.log();
  log('🎉', 'SEED COMPLETO!');
  log('📊', 'Database populada com dados reais do Chi Sublime');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Falha no seed:', err);
  process.exit(1);
});
