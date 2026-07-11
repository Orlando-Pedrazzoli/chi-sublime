// 📄 src/lib/server-actions/settings.ts
'use server';

/**
 * Chi Sublime — Definições (settings)
 * ============================================================
 * Atualiza as definições fiscais/faturação. Os tokens OAuth do
 * Moloni (accessToken/refreshToken) NÃO são editáveis aqui — são
 * geridos pelo MoloniAuth e vêm das env vars. Por isso o update do
 * sub-doc `moloni` usa dot-notation (moloni.campo) para preservar
 * os tokens já guardados.
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { FiscalSettings } from '@/lib/models';
import { ok, fail, type ActionResult } from '@/types/common';

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

const updateFiscalSchema = z.object({
  invoiceProvider: z.enum(['mock', 'moloni', 'invoicexpress', 'vendus', 'atura']),
  defaultVatRate: z.number().min(0).max(100),
  vatExemptionReason: z.string().max(200).optional(),
  incomePrefix: z.string().max(10).optional(),
  expensePrefix: z.string().max(10).optional(),
  moloni: z
    .object({
      enabled: z.boolean().optional(),
      companyId: z.number().int().nonnegative().optional(),
      defaultDocumentSetId: z.number().int().nonnegative().optional(),
      vatTaxId: z.number().int().nonnegative().optional(),
      consumidorFinalCustomerId: z.number().int().nonnegative().optional(),
      defaultPaymentMethodId: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export async function updateFiscalSettingsAction(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateFiscalSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos. Verifica os campos.');

  const d = parsed.data;

  const set: Record<string, unknown> = {
    invoiceProvider: d.invoiceProvider,
    defaultVatRate: d.defaultVatRate,
  };
  if (d.vatExemptionReason !== undefined)
    set.vatExemptionReason = d.vatExemptionReason || undefined;
  if (d.incomePrefix !== undefined) set.incomePrefix = d.incomePrefix;
  if (d.expensePrefix !== undefined) set.expensePrefix = d.expensePrefix;

  if (d.moloni) {
    const m = d.moloni;
    if (m.enabled !== undefined) set['moloni.enabled'] = m.enabled;
    if (m.companyId !== undefined) set['moloni.companyId'] = m.companyId;
    if (m.defaultDocumentSetId !== undefined)
      set['moloni.defaultDocumentSetId'] = m.defaultDocumentSetId;
    if (m.vatTaxId !== undefined) set['moloni.vatTaxId'] = m.vatTaxId;
    if (m.consumidorFinalCustomerId !== undefined)
      set['moloni.consumidorFinalCustomerId'] = m.consumidorFinalCustomerId;
    if (m.defaultPaymentMethodId !== undefined)
      set['moloni.defaultPaymentMethodId'] = m.defaultPaymentMethodId;
  }

  await connectDB();
  await FiscalSettings.updateOne({ key: 'default' }, { $set: set }, { upsert: true });

  revalidatePath('/admin/definicoes/faturacao');
  return ok({ ok: true });
}
