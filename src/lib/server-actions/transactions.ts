'use server';

// 📄 src/lib/server-actions/transactions.ts

/**
 * Chi Sublime — Server Actions: Transações (núcleo financeiro)
 * ============================================================
 *
 * Receitas (POS + manual), despesas, reembolsos, listagem/filtros
 * e o CRUD das categorias de receita e despesa.
 *
 * Convenção fiscal (espelha models/Transaction.ts):
 *   - `amount` é o LÍQUIDO em cêntimos.
 *   - vatAmount = round(amount × vatRate / 100)  (via calculateVAT)
 *   - totalWithVat = amount + vatAmount
 *   O pre('save') do model apenas VALIDA esta coerência — por isso a
 *   action tem de passar os três valores já calculados.
 *   - `tipAmount` é separado e NÃO entra em totalWithVat.
 *   - Uma transação tem UMA taxa de IVA. Serviços com taxas
 *     diferentes usam a taxa da transação (o detalhe multi-taxa por
 *     linha é da faturação, Fase 3).
 *
 * Reembolso: marca a transação como `refunded` (sai das agregações
 * de caixa/relatórios, que só contam `completed`). Os campos
 * refundTransactionId/refundedTransactionId ficam reservados para o
 * fluxo de nota de crédito da faturação (Fase 3).
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import {
  Transaction,
  IncomeCategory,
  ExpenseCategory,
  generateTransactionNumber,
  slugify,
  logAudit,
} from '@/lib/models';
import { calculateVAT, applyDiscount } from '@/lib/utils/cents';
import { ok, fail, type ActionResult, type Paginated } from '@/types/common';
import {
  createIncomeSchema,
  createExpenseSchema,
  refundTransactionSchema,
  listTransactionsSchema,
  transactionIdSchema,
  createIncomeCategorySchema,
  updateIncomeCategorySchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  categoryIdSchema,
} from '@/lib/validation/transaction';

// ============================================================
// DTOs
// ============================================================

export type TransactionServiceLine = {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
};

export type TransactionListItem = {
  id: string;
  transactionNumber: string;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  tipAmount: number;
  paymentMethod: string;
  status: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  invoiceRequested: boolean;
  invoiceIssued: boolean;
};

export type TransactionDetail = TransactionListItem & {
  clientId?: string;
  bookingId?: string;
  staffId?: string;
  supplier?: string;
  supplierInvoiceNumber?: string;
  invoiceFile?: string;
  services: TransactionServiceLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceCategoryItem = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
  isDefault: boolean;
  isFixed?: boolean;
  monthlyBudget?: number;
  usageCount: number;
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

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function categoryLabel(doc: any): string | undefined {
  const cat = doc.incomeCategoryId ?? doc.expenseCategoryId;
  return cat && typeof cat === 'object' ? cat.name : undefined;
}

function categoryIdOf(doc: any): string | undefined {
  const cat = doc.incomeCategoryId ?? doc.expenseCategoryId;
  if (!cat) return undefined;
  return typeof cat === 'object' ? String(cat._id) : String(cat);
}

function toListItem(doc: any): TransactionListItem {
  return {
    id: String(doc._id),
    transactionNumber: doc.transactionNumber,
    type: doc.type,
    date: new Date(doc.date).toISOString(),
    amount: doc.amount,
    vatRate: doc.vatRate,
    vatAmount: doc.vatAmount,
    totalWithVat: doc.totalWithVat,
    tipAmount: doc.tipAmount ?? 0,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    categoryId: categoryIdOf(doc),
    categoryName: categoryLabel(doc),
    description: doc.description,
    invoiceRequested: Boolean(doc.invoiceRequested),
    invoiceIssued: Boolean(doc.invoiceData?.issued),
  };
}

function toDetail(doc: any): TransactionDetail {
  return {
    ...toListItem(doc),
    clientId: doc.clientId ? String(doc.clientId) : undefined,
    bookingId: doc.bookingId ? String(doc.bookingId) : undefined,
    staffId: doc.staffId ? String(doc.staffId) : undefined,
    supplier: doc.supplier,
    supplierInvoiceNumber: doc.supplierInvoiceNumber,
    invoiceFile: doc.invoiceFile,
    services: (doc.services ?? []).map((s: any) => ({
      serviceId: String(s.serviceId),
      name: s.name,
      price: s.price,
      quantity: s.quantity,
      discount: s.discount ?? 0,
    })),
    notes: doc.notes,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function auditActor(admin: { id: string; name: string; email: string }) {
  return {
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin' as const,
  };
}

// ============================================================
// RECEITA
// ============================================================

export async function createIncomeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;

  // Líquido: das linhas de serviço (preço unitário líquido × qtd, com
  // desconto por linha) ou do valor manual.
  let netAmount: number;
  const serviceItems = data.services.map((s) => ({
    serviceId: new mongoose.Types.ObjectId(s.serviceId),
    name: s.name,
    price: s.price,
    quantity: s.quantity,
    discount: s.discount,
  }));

  if (data.services.length > 0) {
    netAmount = data.services.reduce(
      (sum, s) => sum + applyDiscount(s.price * s.quantity, s.discount),
      0,
    );
  } else {
    netAmount = data.amount ?? 0;
  }

  if (netAmount <= 0) return fail('validation', 'O valor da receita tem de ser positivo');

  const { vatCents, totalCents } = calculateVAT(netAmount, data.vatRate);

  try {
    const transactionNumber = await generateTransactionNumber('income');
    const tx = await Transaction.create({
      transactionNumber,
      type: 'income',
      date: data.date ?? new Date(),
      amount: netAmount,
      vatRate: data.vatRate,
      vatAmount: vatCents,
      totalWithVat: totalCents,
      incomeCategoryId: data.incomeCategoryId,
      clientId: data.clientId,
      bookingId: data.bookingId,
      staffId: data.staffId,
      services: serviceItems,
      tipAmount: data.tipAmount,
      paymentMethod: data.paymentMethod,
      description: data.description,
      notes: data.notes,
      invoiceRequested: data.invoiceRequested,
      status: 'completed',
      createdBy: new mongoose.Types.ObjectId(admin.id),
    });

    await logAudit({
      action: 'create',
      resource: 'transaction',
      resourceId: String(tx._id),
      resourceLabel: transactionNumber,
      ...auditActor(admin),
      message: `Receita ${transactionNumber}: ${totalCents} cêntimos (${data.paymentMethod})`,
      severity: 'info',
      metadata: { total: totalCents, tip: data.tipAmount },
    });

    revalidatePath('/admin/receitas');
    revalidatePath('/admin/caixa');
    return ok({ id: String(tx._id) });
  } catch (err) {
    console.error('[createIncomeAction]', err);
    return fail('server', 'Erro ao registar receita');
  }
}

// ============================================================
// DESPESA
// ============================================================

export async function createExpenseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;
  const { vatCents, totalCents } = calculateVAT(data.amount, data.vatRate);

  try {
    const transactionNumber = await generateTransactionNumber('expense');
    const tx = await Transaction.create({
      transactionNumber,
      type: 'expense',
      date: data.date ?? new Date(),
      amount: data.amount,
      vatRate: data.vatRate,
      vatAmount: vatCents,
      totalWithVat: totalCents,
      expenseCategoryId: data.expenseCategoryId,
      supplier: data.supplier,
      supplierInvoiceNumber: data.supplierInvoiceNumber,
      invoiceFile: data.invoiceFile,
      recurring: data.recurring,
      paymentMethod: data.paymentMethod,
      description: data.description,
      notes: data.notes,
      status: 'completed',
      createdBy: new mongoose.Types.ObjectId(admin.id),
    });

    await logAudit({
      action: 'create',
      resource: 'transaction',
      resourceId: String(tx._id),
      resourceLabel: transactionNumber,
      ...auditActor(admin),
      message: `Despesa ${transactionNumber}: ${totalCents} cêntimos (${data.paymentMethod})`,
      severity: 'info',
      metadata: { total: totalCents, supplier: data.supplier },
    });

    revalidatePath('/admin/despesas');
    revalidatePath('/admin/caixa');
    return ok({ id: String(tx._id) });
  } catch (err) {
    console.error('[createExpenseAction]', err);
    return fail('server', 'Erro ao registar despesa');
  }
}

// ============================================================
// REEMBOLSO
// ============================================================

export async function refundTransactionAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = refundTransactionSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const tx = await Transaction.findById(parsed.data.id);
  if (!tx) return fail('not_found', 'Transação não encontrada');
  if (tx.status === 'refunded') return fail('already_refunded', 'Transação já reembolsada');
  if (tx.status === 'cancelled')
    return fail('cancelled', 'Transação cancelada não pode ser reembolsada');

  tx.status = 'refunded';
  if (parsed.data.reason) {
    tx.notes = tx.notes
      ? `${tx.notes}\n[Reembolso] ${parsed.data.reason}`
      : `[Reembolso] ${parsed.data.reason}`;
  }
  await tx.save();

  await logAudit({
    action: 'refund',
    resource: 'transaction',
    resourceId: String(tx._id),
    resourceLabel: tx.transactionNumber,
    ...auditActor(admin),
    message: `Reembolso de ${tx.transactionNumber} (${tx.totalWithVat} cêntimos)`,
    severity: 'warning',
    metadata: { reason: parsed.data.reason, total: tx.totalWithVat },
  });

  revalidatePath('/admin/receitas');
  revalidatePath('/admin/despesas');
  revalidatePath('/admin/caixa');
  return ok(undefined);
}

// ============================================================
// GET / LIST
// ============================================================

export async function getTransactionAction(
  input: unknown,
): Promise<ActionResult<TransactionDetail>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = transactionIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const tx = await Transaction.findById(parsed.data.id)
    .populate('incomeCategoryId', 'name')
    .populate('expenseCategoryId', 'name')
    .lean();
  if (!tx) return fail('not_found', 'Transação não encontrada');

  return ok(toDetail(tx));
}

export async function listTransactionsAction(
  input: unknown,
): Promise<ActionResult<Paginated<TransactionListItem>>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = listTransactionsSchema.safeParse(input ?? {});
  if (!parsed.success) return fail('validation', 'Filtros inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const p = parsed.data;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const query: Record<string, any> = {};
  if (p.type) query.type = p.type;
  if (p.status) query.status = p.status;
  if (p.paymentMethod) query.paymentMethod = p.paymentMethod;
  if (p.incomeCategoryId) query.incomeCategoryId = p.incomeCategoryId;
  if (p.expenseCategoryId) query.expenseCategoryId = p.expenseCategoryId;
  if (p.staffId) query.staffId = p.staffId;
  if (p.clientId) query.clientId = p.clientId;
  if (p.invoiceRequested !== undefined) query.invoiceRequested = p.invoiceRequested;
  if (p.from || p.to) {
    query.date = {};
    if (p.from) query.date.$gte = p.from;
    if (p.to) query.date.$lte = p.to;
  }
  if (p.search) {
    const safe = p.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    query.$or = [{ transactionNumber: regex }, { description: regex }, { supplier: regex }];
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [docs, total] = await Promise.all([
    Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((p.page - 1) * p.pageSize)
      .limit(p.pageSize)
      .populate('incomeCategoryId', 'name')
      .populate('expenseCategoryId', 'name')
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return ok({
    items: docs.map(toListItem),
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  });
}

// ============================================================
// CATEGORIAS — RECEITA
// ============================================================

export async function createIncomeCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createIncomeCategorySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);

  try {
    const cat = await IncomeCategory.create({
      name: data.name,
      slug,
      description: data.description,
      color: data.color,
      icon: data.icon,
      order: data.order,
      active: data.active,
    });

    await logAudit({
      action: 'create',
      resource: 'transaction',
      resourceId: String(cat._id),
      resourceLabel: cat.name,
      ...auditActor(admin),
      message: `Categoria de receita criada: ${cat.name}`,
      severity: 'info',
    });

    revalidatePath('/admin/receitas');
    return ok({ id: String(cat._id) });
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    console.error('[createIncomeCategoryAction]', err);
    return fail('server', 'Erro ao criar categoria');
  }
}

export async function updateIncomeCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateIncomeCategorySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { id, ...data } = parsed.data;
  const cat = await IncomeCategory.findById(id);
  if (!cat) return fail('not_found', 'Categoria não encontrada');

  if (data.name !== undefined) cat.name = data.name;
  if (data.slug !== undefined) cat.slug = data.slug || slugify(data.name ?? cat.name);
  if (data.description !== undefined) cat.description = data.description;
  if (data.color !== undefined) cat.color = data.color;
  if (data.icon !== undefined) cat.icon = data.icon;
  if (data.order !== undefined) cat.order = data.order;
  if (data.active !== undefined) cat.active = data.active;

  try {
    await cat.save();
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    if (err instanceof Error && /default/i.test(err.message))
      return fail('validation', err.message);
    console.error('[updateIncomeCategoryAction]', err);
    return fail('server', 'Erro ao atualizar categoria');
  }

  await logAudit({
    action: 'update',
    resource: 'transaction',
    resourceId: String(cat._id),
    resourceLabel: cat.name,
    ...auditActor(admin),
    message: `Categoria de receita atualizada: ${cat.name}`,
    severity: 'info',
  });

  revalidatePath('/admin/receitas');
  return ok({ id: String(cat._id) });
}

export async function deleteIncomeCategoryAction(input: unknown): Promise<ActionResult> {
  return deleteFinanceCategory(input, 'income');
}

export async function listIncomeCategoriesAction(): Promise<ActionResult<FinanceCategoryItem[]>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  await connectDB();

  const cats = await IncomeCategory.find({}).sort({ order: 1 }).lean();
  const usage = await Transaction.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { type: 'income' } },
    { $group: { _id: '$incomeCategoryId', count: { $sum: 1 } } },
  ]);
  const usageMap = new Map(usage.map((u) => [String(u._id), u.count]));

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: FinanceCategoryItem[] = cats.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
    icon: c.icon,
    order: c.order ?? 0,
    active: c.active !== false,
    isDefault: Boolean(c.isDefault),
    usageCount: usageMap.get(String(c._id)) ?? 0,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return ok(items);
}

// ============================================================
// CATEGORIAS — DESPESA
// ============================================================

export async function createExpenseCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createExpenseCategorySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);

  try {
    const cat = await ExpenseCategory.create({
      name: data.name,
      slug,
      description: data.description,
      color: data.color,
      icon: data.icon,
      order: data.order,
      active: data.active,
      isFixed: data.isFixed,
      monthlyBudget: data.monthlyBudget,
    });

    await logAudit({
      action: 'create',
      resource: 'transaction',
      resourceId: String(cat._id),
      resourceLabel: cat.name,
      ...auditActor(admin),
      message: `Categoria de despesa criada: ${cat.name}`,
      severity: 'info',
    });

    revalidatePath('/admin/despesas/categorias');
    return ok({ id: String(cat._id) });
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    console.error('[createExpenseCategoryAction]', err);
    return fail('server', 'Erro ao criar categoria');
  }
}

export async function updateExpenseCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateExpenseCategorySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { id, ...data } = parsed.data;
  const cat = await ExpenseCategory.findById(id);
  if (!cat) return fail('not_found', 'Categoria não encontrada');

  if (data.name !== undefined) cat.name = data.name;
  if (data.slug !== undefined) cat.slug = data.slug || slugify(data.name ?? cat.name);
  if (data.description !== undefined) cat.description = data.description;
  if (data.color !== undefined) cat.color = data.color;
  if (data.icon !== undefined) cat.icon = data.icon;
  if (data.order !== undefined) cat.order = data.order;
  if (data.active !== undefined) cat.active = data.active;
  if (data.isFixed !== undefined) cat.isFixed = data.isFixed;
  if (data.monthlyBudget !== undefined) cat.monthlyBudget = data.monthlyBudget;

  try {
    await cat.save();
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    if (err instanceof Error && /default/i.test(err.message))
      return fail('validation', err.message);
    console.error('[updateExpenseCategoryAction]', err);
    return fail('server', 'Erro ao atualizar categoria');
  }

  await logAudit({
    action: 'update',
    resource: 'transaction',
    resourceId: String(cat._id),
    resourceLabel: cat.name,
    ...auditActor(admin),
    message: `Categoria de despesa atualizada: ${cat.name}`,
    severity: 'info',
  });

  revalidatePath('/admin/despesas/categorias');
  return ok({ id: String(cat._id) });
}

export async function deleteExpenseCategoryAction(input: unknown): Promise<ActionResult> {
  return deleteFinanceCategory(input, 'expense');
}

export async function listExpenseCategoriesAction(): Promise<ActionResult<FinanceCategoryItem[]>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  await connectDB();

  const cats = await ExpenseCategory.find({}).sort({ order: 1 }).lean();
  const usage = await Transaction.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { type: 'expense' } },
    { $group: { _id: '$expenseCategoryId', count: { $sum: 1 } } },
  ]);
  const usageMap = new Map(usage.map((u) => [String(u._id), u.count]));

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: FinanceCategoryItem[] = cats.map((c: any) => ({
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    description: c.description,
    color: c.color,
    icon: c.icon,
    order: c.order ?? 0,
    active: c.active !== false,
    isDefault: Boolean(c.isDefault),
    isFixed: Boolean(c.isFixed),
    monthlyBudget: c.monthlyBudget ?? 0,
    usageCount: usageMap.get(String(c._id)) ?? 0,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return ok(items);
}

// ============================================================
// DELETE partilhado das categorias financeiras
// ============================================================

async function deleteFinanceCategory(
  input: unknown,
  kind: 'income' | 'expense',
): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const field = kind === 'income' ? 'incomeCategoryId' : 'expenseCategoryId';

  const cat =
    kind === 'income'
      ? await IncomeCategory.findById(parsed.data.id)
      : await ExpenseCategory.findById(parsed.data.id);
  if (!cat) return fail('not_found', 'Categoria não encontrada');
  if (cat.isDefault) return fail('is_default', 'Não é possível apagar uma categoria default');

  const usageCount = await Transaction.countDocuments({ [field]: cat._id });
  if (usageCount > 0) {
    // Tem transações associadas — desativar em vez de apagar.
    cat.active = false;
    await cat.save();

    await logAudit({
      action: 'update',
      resource: 'transaction',
      resourceId: String(cat._id),
      resourceLabel: cat.name,
      ...auditActor(admin),
      message: `Categoria (${kind}) desativada (${usageCount} transação(ões)): ${cat.name}`,
      severity: 'warning',
    });
  } else {
    await cat.deleteOne();

    await logAudit({
      action: 'delete',
      resource: 'transaction',
      resourceId: String(cat._id),
      resourceLabel: cat.name,
      ...auditActor(admin),
      message: `Categoria (${kind}) apagada: ${cat.name}`,
      severity: 'warning',
    });
  }

  revalidatePath(kind === 'income' ? '/admin/receitas' : '/admin/despesas/categorias');
  return ok(undefined);
}
