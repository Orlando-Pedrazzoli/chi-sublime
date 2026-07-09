'use server';

/**
 * Chi Sublime — Server Actions: Caixa (Cash Register)
 * ============================================================
 *
 * Abertura e fecho de caixa diário, com agregação das transações
 * concluídas do dia por método de pagamento.
 *
 * Convenções:
 *   - Um registo de caixa por dia (índice único em `date`). A data é
 *     normalizada para o MEIO-DIA UTC do dia indicado, para nunca
 *     cruzar a fronteira de DST (mesma lógica dos feriados).
 *   - Valores em CÊNTIMOS. As agregações usam `totalWithVat` (o
 *     dinheiro que realmente entrou/saiu) + `tipAmount` nas receitas.
 *   - expectedCash e difference são calculados pelo pre('save') do
 *     model (openingCash + income.cash − expense.cash). A action só
 *     preenche openingCash, os breakdowns e o closingCash.
 *   - Os schemas de input são locais (a Caixa não faz parte dos 5
 *     scaffolds de validation/).
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { CashRegister, Transaction, PAYMENT_METHODS, logAudit } from '@/lib/models';
import { ok, fail, type ActionResult, type Paginated } from '@/types/common';
import { centsSchema, isoDateSchema, paginationSchema } from '@/lib/validation/shared';

// ============================================================
// INPUT SCHEMAS (locais)
// ============================================================

const openCashSchema = z.object({
  date: isoDateSchema,
  openingCash: centsSchema.default(0),
  notes: z.string().trim().max(1000).optional(),
});

const closeCashSchema = z.object({
  date: isoDateSchema,
  closingCash: centsSchema,
  differenceReason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const dateOnlySchema = z.object({ date: isoDateSchema });

// ============================================================
// DTOs
// ============================================================

export type PaymentBreakdown = {
  cash: number;
  card_terminal: number;
  mb_way: number;
  multibanco: number;
  transfer: number;
  other: number;
};

export type CashRegisterDTO = {
  id?: string;
  date: string;
  exists: boolean;
  openingCash: number;
  openedAt?: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByPaymentMethod: PaymentBreakdown;
  expenseByPaymentMethod: PaymentBreakdown;
  expectedCash: number;
  closingCash: number;
  difference: number;
  differenceReason?: string;
  closed: boolean;
  closedAt?: string;
  notes?: string;
};

export type CashRegisterListItem = {
  id: string;
  date: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  expectedCash: number;
  closingCash: number;
  difference: number;
  closed: boolean;
};

// ============================================================
// HELPERS
// ============================================================

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

function fieldErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join('.') || '_root';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Meio-dia UTC do dia YYYY-MM-DD (canónico, sem cruzar DST). */
function canonicalDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

function dayBounds(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end: new Date(`${dateStr}T23:59:59.999Z`),
  };
}

function emptyBreakdown(): PaymentBreakdown {
  return { cash: 0, card_terminal: 0, mb_way: 0, multibanco: 0, transfer: 0, other: 0 };
}

function sumBreakdown(b: PaymentBreakdown): number {
  return PAYMENT_METHODS.reduce((acc, m) => acc + b[m], 0);
}

/**
 * Agrega as transações CONCLUÍDAS do dia por (tipo, método).
 * Receitas incluem a gorjeta (tipAmount); despesas não têm gorjeta.
 */
async function aggregateDay(dateStr: string): Promise<{
  income: PaymentBreakdown;
  expense: PaymentBreakdown;
  totalIncome: number;
  totalExpense: number;
}> {
  const { start, end } = dayBounds(dateStr);

  const rows = await Transaction.aggregate<{
    _id: { type: 'income' | 'expense'; method: keyof PaymentBreakdown };
    total: number;
  }>([
    { $match: { date: { $gte: start, $lte: end }, status: 'completed' } },
    {
      $group: {
        _id: { type: '$type', method: '$paymentMethod' },
        total: { $sum: { $add: ['$totalWithVat', { $ifNull: ['$tipAmount', 0] }] } },
      },
    },
  ]);

  const income = emptyBreakdown();
  const expense = emptyBreakdown();

  for (const row of rows) {
    const target = row._id.type === 'income' ? income : expense;
    if (row._id.method in target) target[row._id.method] += row.total;
  }

  return {
    income,
    expense,
    totalIncome: sumBreakdown(income),
    totalExpense: sumBreakdown(expense),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toBreakdown(raw: any): PaymentBreakdown {
  const b = emptyBreakdown();
  for (const m of PAYMENT_METHODS) b[m] = raw?.[m] ?? 0;
  return b;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// ABRIR CAIXA
// ============================================================

export async function openCashRegisterAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = openCashSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { date, openingCash, notes } = parsed.data;
  const canonical = canonicalDate(date);

  const existing = await CashRegister.findOne({ date: canonical });
  if (existing) {
    if (existing.closed) return fail('closed', 'A caixa deste dia já foi fechada');
    return fail('already_open', 'A caixa deste dia já está aberta');
  }

  try {
    const register = await CashRegister.create({
      date: canonical,
      openingCash,
      openedBy: new mongoose.Types.ObjectId(admin.id),
      openedAt: new Date(),
      notes,
    });

    await logAudit({
      action: 'open',
      resource: 'cash-register',
      resourceId: String(register._id),
      resourceLabel: date,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Caixa aberta (${date}) com fundo de ${openingCash} cêntimos`,
      severity: 'info',
    });

    revalidatePath('/admin/caixa');
    return ok({ id: String(register._id) });
  } catch (err) {
    console.error('[openCashRegisterAction]', err);
    return fail('server', 'Erro ao abrir caixa');
  }
}

// ============================================================
// FECHAR CAIXA
// ============================================================

export async function closeCashRegisterAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = closeCashSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { date, closingCash, differenceReason, notes } = parsed.data;
  const register = await CashRegister.findOne({ date: canonicalDate(date) });
  if (!register) return fail('not_found', 'A caixa deste dia não está aberta');
  if (register.closed) return fail('closed', 'A caixa deste dia já foi fechada');

  const agg = await aggregateDay(date);

  register.totalIncome = agg.totalIncome;
  register.totalExpense = agg.totalExpense;
  register.set('incomeByPaymentMethod', agg.income);
  register.set('expenseByPaymentMethod', agg.expense);
  register.closingCash = closingCash;
  register.closedBy = new mongoose.Types.ObjectId(admin.id);
  register.closedAt = new Date();
  register.closed = true;
  if (differenceReason) register.differenceReason = differenceReason;
  if (notes) register.notes = notes;

  try {
    // O pre('save') calcula expectedCash e difference, e exige
    // differenceReason se houver diferença.
    await register.save();
  } catch (err) {
    if (err instanceof Error && /Justificação|differenceReason/i.test(err.message)) {
      return fail('needs_reason', 'Há diferença de caixa — justificação obrigatória', {
        differenceReason: ['Justifica a diferença entre o esperado e o contado'],
      });
    }
    console.error('[closeCashRegisterAction]', err);
    return fail('server', 'Erro ao fechar caixa');
  }

  await logAudit({
    action: 'close',
    resource: 'cash-register',
    resourceId: String(register._id),
    resourceLabel: date,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Caixa fechada (${date}) — diferença ${register.difference} cêntimos`,
    severity: register.difference !== 0 ? 'warning' : 'info',
    metadata: {
      totalIncome: register.totalIncome,
      totalExpense: register.totalExpense,
      expectedCash: register.expectedCash,
      closingCash: register.closingCash,
      difference: register.difference,
    },
  });

  revalidatePath('/admin/caixa');
  return ok(undefined);
}

// ============================================================
// GET (registo + agregação AO VIVO do dia)
// ============================================================

export async function getCashRegisterAction(
  input: unknown,
): Promise<ActionResult<CashRegisterDTO>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = dateOnlySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Data inválida.');

  await connectDB();

  const { date } = parsed.data;
  const register = await CashRegister.findOne({ date: canonicalDate(date) }).lean();
  const agg = await aggregateDay(date);

  // Se já está fechada, mostramos o snapshot persistido; se aberta (ou
  // inexistente), mostramos a agregação ao vivo.
  const closed = Boolean(register?.closed);
  const income = closed ? toBreakdown(register?.incomeByPaymentMethod) : agg.income;
  const expense = closed ? toBreakdown(register?.expenseByPaymentMethod) : agg.expense;
  const totalIncome = closed ? (register?.totalIncome ?? 0) : agg.totalIncome;
  const totalExpense = closed ? (register?.totalExpense ?? 0) : agg.totalExpense;
  const openingCash = register?.openingCash ?? 0;
  const expectedCash = closed
    ? (register?.expectedCash ?? 0)
    : openingCash + income.cash - expense.cash;

  return ok({
    id: register ? String(register._id) : undefined,
    date,
    exists: Boolean(register),
    openingCash,
    openedAt: register?.openedAt ? new Date(register.openedAt).toISOString() : undefined,
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    incomeByPaymentMethod: income,
    expenseByPaymentMethod: expense,
    expectedCash,
    closingCash: register?.closingCash ?? 0,
    difference: register?.difference ?? 0,
    differenceReason: register?.differenceReason,
    closed,
    closedAt: register?.closedAt ? new Date(register.closedAt).toISOString() : undefined,
    notes: register?.notes,
  });
}

// ============================================================
// LIST (histórico)
// ============================================================

export async function listCashRegistersAction(
  input: unknown,
): Promise<ActionResult<Paginated<CashRegisterListItem>>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = paginationSchema.safeParse(input ?? {});
  if (!parsed.success) return fail('validation', 'Filtros inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { page, pageSize } = parsed.data;

  const [docs, total] = await Promise.all([
    CashRegister.find({})
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    CashRegister.countDocuments({}),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: CashRegisterListItem[] = docs.map((d: any) => ({
    id: String(d._id),
    date: new Date(d.date).toISOString(),
    totalIncome: d.totalIncome ?? 0,
    totalExpense: d.totalExpense ?? 0,
    netProfit: (d.totalIncome ?? 0) - (d.totalExpense ?? 0),
    expectedCash: d.expectedCash ?? 0,
    closingCash: d.closingCash ?? 0,
    difference: d.difference ?? 0,
    closed: Boolean(d.closed),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
