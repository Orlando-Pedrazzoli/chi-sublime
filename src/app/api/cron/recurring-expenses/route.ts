// 📄 src/app/api/cron/recurring-expenses/route.ts
/**
 * Chi Sublime — Cron: Despesas recorrentes
 * ============================================================
 *
 * Corre diariamente (vercel.json). Para cada despesa-modelo com
 * `recurring.enabled: true` e `recurring.nextDueDate` vencida:
 *
 *   1. Cria uma NOVA despesa (status completed) datada do vencimento,
 *      copiando categoria, fornecedor, valores e método de pagamento.
 *      A cópia NÃO leva `recurring` — só o modelo original recorre.
 *   2. Avança `nextDueDate` do modelo (weekly +7d / monthly +1m /
 *      yearly +1a) até ficar no futuro — se o cron falhar uns dias,
 *      os períodos em atraso são todos materializados no catch-up.
 *
 * Segurança: exige `Authorization: Bearer ${CRON_SECRET}`. O Vercel
 * envia este header automaticamente quando a env var CRON_SECRET
 * está definida no projeto.
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import { Transaction, generateTransactionNumber, logAudit } from '@/lib/models';

export const dynamic = 'force-dynamic';

/** Trava de segurança: nunca materializar mais do que isto por modelo. */
const MAX_CATCHUP_PER_TEMPLATE = 24;

function advance(date: Date, frequency: 'weekly' | 'monthly' | 'yearly'): Date {
  const next = new Date(date);
  if (frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    // setUTCMonth trata overflow (31 Jan → 2/3 Mar); fixamos ao último
    // dia do mês seguinte quando o dia não existe.
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
    ).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }
  return next;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const templates = await Transaction.find({
    type: 'expense',
    'recurring.enabled': true,
    'recurring.nextDueDate': { $lte: now },
  });

  let created = 0;
  const errors: string[] = [];

  for (const template of templates) {
    const recurring = template.recurring;
    if (!recurring) continue;

    let dueDate = new Date(recurring.nextDueDate);
    let iterations = 0;

    while (dueDate <= now && iterations < MAX_CATCHUP_PER_TEMPLATE) {
      try {
        const transactionNumber = await generateTransactionNumber('expense');
        const tx = await Transaction.create({
          transactionNumber,
          type: 'expense',
          date: dueDate,
          amount: template.amount,
          vatRate: template.vatRate,
          vatAmount: template.vatAmount,
          totalWithVat: template.totalWithVat,
          expenseCategoryId: template.expenseCategoryId,
          supplier: template.supplier,
          supplierInvoiceNumber: undefined,
          paymentMethod: template.paymentMethod,
          description: template.description,
          notes: `Gerada automaticamente (recorrente ${recurring.frequency}) a partir de ${template.transactionNumber}.`,
          status: 'completed',
          createdBy: template.createdBy,
        });

        await logAudit({
          action: 'create',
          resource: 'transaction',
          resourceId: String(tx._id),
          resourceLabel: transactionNumber,
          userName: 'Sistema (cron)',
          userRole: 'system',
          message: `Despesa recorrente ${transactionNumber} gerada a partir de ${template.transactionNumber} (${template.totalWithVat} cêntimos)`,
          severity: 'info',
          metadata: {
            templateId: String(template._id),
            frequency: recurring.frequency,
            dueDate: dueDate.toISOString(),
          },
        });

        created += 1;
      } catch (err) {
        console.error('[cron/recurring-expenses]', template.transactionNumber, err);
        errors.push(template.transactionNumber);
        break; // não avançar nextDueDate se a criação falhou
      }

      dueDate = advance(dueDate, recurring.frequency);
      iterations += 1;
    }

    // Persistir o novo nextDueDate no modelo (só se avançou)
    if (dueDate.getTime() !== new Date(recurring.nextDueDate).getTime()) {
      await Transaction.updateOne(
        { _id: template._id },
        { $set: { 'recurring.nextDueDate': dueDate } },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    templates: templates.length,
    created,
    errors,
  });
}
