'use server';

// 📄 src/lib/invoicing/issueInvoiceAction.ts
/**
 * Chi Sublime — Server Action: Emitir / Re-tentar Fatura
 * ============================================================
 *
 * Orquestra a emissão de documento fiscal a partir de uma transação
 * de RECEITA concluída:
 *   valida input → carrega tx + FiscalSettings → escolhe o provider
 *   (getInvoiceProvider) → emite → persiste invoiceData (sucesso) ou
 *   invoiceError (falha, com flag retryable) → audita.
 *
 * O envio do PDF por email fica para a batch de Email; aqui apenas se
 * marca sentToCustomer=false e guarda-se o customerEmail.
 */

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { Transaction, Client, getFiscalSettings, logAudit } from '@/lib/models';
import { centsToEuros } from '@/lib/utils/cents';
import { sendInvoiceReceiptEmail } from '@/lib/email/send';
import { ok, fail, type ActionResult } from '@/types/common';
import { issueInvoiceSchema, retryInvoiceSchema } from '@/lib/validation/invoice';
import {
  getInvoiceProvider,
  InvoiceProviderError,
  type InvoiceCustomer,
  type InvoiceDocumentType,
  type InvoiceLineInput,
} from './index';

type IssueOk = { documentNumber: string; pdfUrl: string };

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(
    centsToEuros(cents),
  );
}

function formatDatePt(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function customerFromTransaction(tx: any): Promise<InvoiceCustomer> {
  // 1) Snapshot já guardado numa emissão anterior
  const snap = tx.invoiceData?.customerSnapshot;
  if (snap?.name) {
    return {
      name: snap.name,
      vatNumber: snap.vatNumber,
      email: snap.email,
      address: snap.address,
      postalCode: snap.postalCode,
      city: snap.city,
      country: snap.country ?? 'PT',
    };
  }
  // 2) A partir do cliente associado
  if (tx.clientId) {
    const client: any = await Client.findById(tx.clientId).lean();
    if (client) {
      return {
        name: client.fiscalData?.fullLegalName || client.name,
        vatNumber: client.fiscalData?.vatNumber,
        email: client.preferredInvoiceEmail || client.email,
        address: client.fiscalData?.address,
        postalCode: client.fiscalData?.postalCode,
        city: client.fiscalData?.city,
        country: client.fiscalData?.country ?? 'PT',
      };
    }
  }
  // 3) Consumidor final
  return { name: 'Consumidor Final', country: 'PT' };
}

function linesFromTransaction(tx: any): InvoiceLineInput[] {
  if (Array.isArray(tx.services) && tx.services.length > 0) {
    return tx.services.map((s: any) => ({
      name: s.name,
      quantity: s.quantity ?? 1,
      unitPriceNet: s.price,
      vatRate: tx.vatRate,
      discountPercent: s.discount ?? 0,
    }));
  }
  return [
    {
      name: tx.description || 'Serviço',
      quantity: 1,
      unitPriceNet: tx.amount,
      vatRate: tx.vatRate,
    },
  ];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Núcleo partilhado por issue e retry. Assume que já há sessão admin.
 */
async function performIssue(
  transactionId: string,
  documentType: InvoiceDocumentType,
  customerOverride: InvoiceCustomer | null,
  admin: { id: string; name: string; email: string },
  sendEmailToCustomer: boolean,
): Promise<ActionResult<IssueOk>> {
  await connectDB();

  const tx = await Transaction.findById(transactionId);
  if (!tx) return fail('not_found', 'Transação não encontrada');
  if (tx.type !== 'income') {
    return fail('not_income', 'Só se emitem documentos para receitas');
  }
  if (tx.status !== 'completed') {
    return fail('not_completed', 'A transação não está concluída');
  }
  if (tx.invoiceData?.issued) {
    return fail('already_issued', 'Esta transação já tem documento emitido');
  }

  const settings = await getFiscalSettings();
  const customer = customerOverride ?? (await customerFromTransaction(tx));

  // FT e ND exigem NIF do adquirente
  if ((documentType === 'FT' || documentType === 'ND') && !customer.vatNumber) {
    return fail('needs_vat', 'NIF do cliente obrigatório para Fatura (FT) ou Nota de Débito (ND)');
  }

  const params = {
    documentType,
    customer,
    lines: linesFromTransaction(tx),
    totalNet: tx.amount,
    totalVat: tx.vatAmount,
    totalWithVat: tx.totalWithVat,
    currency: settings.defaultCurrency || 'EUR',
    internalReference: tx.transactionNumber,
    notes: tx.description,
  };

  try {
    const provider = getInvoiceProvider(settings.invoiceProvider);
    const issued = await provider.issueInvoice(params);

    tx.set('invoiceData', {
      issued: true,
      issuedAt: issued.issuedAt,
      provider: issued.provider,
      certificationNumber: issued.certificationNumber,
      customerSnapshot: customer,
      externalDocumentId: issued.externalDocumentId,
      documentNumber: issued.documentNumber,
      series: issued.series,
      atcud: issued.atcud,
      documentType: issued.documentType,
      pdfUrl: issued.pdfUrl,
      qrCodeUrl: issued.qrCodeUrl,
      sentToCustomer: false,
      customerEmail: customer.email,
      apiResponseLog: issued.raw,
    });
    tx.invoiceRequested = true;
    tx.set('invoiceError', undefined);

    await tx.save();

    await logAudit({
      action: 'issue',
      resource: 'invoice',
      resourceId: String(tx._id),
      resourceLabel: issued.documentNumber,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Documento emitido (${issued.provider}): ${issued.documentNumber} para ${customer.name}`,
      severity: 'info',
      metadata: { transactionNumber: tx.transactionNumber, provider: issued.provider },
    });

    revalidatePath('/admin/receitas');

    // Envio do documento por email — nunca falha a emissão (o doc já está gravado).
    if (sendEmailToCustomer && customer.email) {
      try {
        const emailResult = await sendInvoiceReceiptEmail({
          to: customer.email,
          name: customer.name,
          documentNumber: issued.documentNumber,
          date: formatDatePt(issued.issuedAt),
          total: formatMoney(tx.totalWithVat, params.currency),
          pdfUrl: issued.pdfUrl,
        });
        if (emailResult.ok) {
          tx.set('invoiceData.sentToCustomer', true);
          tx.set('invoiceData.sentAt', new Date());
          await tx.save();
        } else {
          console.error('[performIssue] email da fatura não enviado:', emailResult.error);
        }
      } catch (mailErr) {
        console.error('[performIssue] erro no email da fatura:', mailErr);
      }
    }

    return ok({ documentNumber: issued.documentNumber, pdfUrl: issued.pdfUrl });
  } catch (err) {
    const isProviderErr = err instanceof InvoiceProviderError;
    const code = isProviderErr ? err.code : 'provider_error';
    const message = isProviderErr ? err.message : 'Erro ao emitir documento';
    const retryable = isProviderErr ? err.retryable : true;

    tx.invoiceRequested = true;
    tx.set('invoiceError', {
      code,
      message,
      timestamp: new Date(),
      retryable,
    });
    try {
      await tx.save();
    } catch (saveErr) {
      console.error('[performIssue] falha a gravar invoiceError', saveErr);
    }

    await logAudit({
      action: 'issue',
      resource: 'invoice',
      resourceId: String(tx._id),
      resourceLabel: tx.transactionNumber,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Falha na emissão de ${tx.transactionNumber}: ${message}`,
      severity: 'critical',
      metadata: { code, retryable },
    });

    console.error('[performIssue]', err);
    return fail(code, message);
  }
}

// ============================================================
// EMITIR
// ============================================================

export async function issueInvoiceAction(input: unknown): Promise<ActionResult<IssueOk>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = issueInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join('.') || '_root';
      (fe[key] ??= []).push(issue.message);
    }
    return fail('validation', 'Dados inválidos. Verifica os campos.', fe);
  }

  const data = parsed.data;
  return performIssue(data.transactionId, data.documentType, data.customer, admin, data.sendEmail);
}

// ============================================================
// RE-TENTAR (após falha)
// ============================================================

export async function retryInvoiceAction(input: unknown): Promise<ActionResult<IssueOk>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = retryInvoiceSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  // Reconstrói o cliente a partir da própria transação (snapshot anterior
  // ou cliente associado). Documento por defeito: fatura-recibo. Reenvia email.
  return performIssue(parsed.data.transactionId, 'FR', null, admin, true);
}
