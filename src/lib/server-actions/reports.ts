// 📄 src/lib/server-actions/reports.ts
'use server';

/**
 * Chi Sublime — Relatórios (agregações)
 * ============================================================
 * Agrega transações CONCLUÍDAS (status 'completed') de um período
 * para os relatórios. Valores em cêntimos.
 */

import { z } from 'zod';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { Transaction } from '@/lib/models';
import { ok, fail, type ActionResult } from '@/types/common';

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

const reportRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export type FinancialReportRow = { name: string; amount: number };

export type FinancialReportDTO = {
  from: string;
  to: string;
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  vatCollected: number;
  vatPaid: number;
  incomeByCategory: FinancialReportRow[];
  expenseByCategory: FinancialReportRow[];
};

function fmt(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

type CategoryAgg = { name: string; amount: number; vat: number };

async function aggregateByCategory(
  from: Date,
  to: Date,
  type: 'income' | 'expense',
  categoryField: 'incomeCategoryId' | 'expenseCategoryId',
  collection: 'incomecategories' | 'expensecategories',
): Promise<CategoryAgg[]> {
  const rows = await Transaction.aggregate([
    { $match: { type, status: 'completed', date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: `$${categoryField}`,
        amount: { $sum: '$totalWithVat' },
        vat: { $sum: '$vatAmount' },
      },
    },
    { $lookup: { from: collection, localField: '_id', foreignField: '_id', as: 'cat' } },
    {
      $project: {
        _id: 0,
        name: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, 'Sem categoria'] },
        amount: 1,
        vat: 1,
      },
    },
    { $sort: { amount: -1 } },
  ]);
  return rows as CategoryAgg[];
}

export async function getFinancialReportAction(
  input: unknown,
): Promise<ActionResult<FinancialReportDTO>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = reportRangeSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Período inválido.');

  const from = new Date(parsed.data.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(parsed.data.to);
  to.setHours(23, 59, 59, 999);

  if (to < from) return fail('validation', 'A data final não pode ser anterior à inicial.');

  await connectDB();

  const [incomeRows, expenseRows] = await Promise.all([
    aggregateByCategory(from, to, 'income', 'incomeCategoryId', 'incomecategories'),
    aggregateByCategory(from, to, 'expense', 'expenseCategoryId', 'expensecategories'),
  ]);

  const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);
  const vatCollected = incomeRows.reduce((s, r) => s + r.vat, 0);
  const vatPaid = expenseRows.reduce((s, r) => s + r.vat, 0);

  return ok({
    from: from.toISOString(),
    to: to.toISOString(),
    periodLabel: `${fmt(from)} – ${fmt(to)}`,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    vatCollected,
    vatPaid,
    incomeByCategory: incomeRows.map((r) => ({ name: r.name, amount: r.amount })),
    expenseByCategory: expenseRows.map((r) => ({ name: r.name, amount: r.amount })),
  });
}
