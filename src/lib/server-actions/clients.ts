'use server';

/**
 * Chi Sublime — Server Actions: Clientes
 * ============================================================
 *
 * CRUD de clientes do salão + pesquisa, paginação e bloqueio.
 *
 * Padrão (igual a admin-bookings.ts):
 *   - requireAdminSession() como portão (devolve null → 'Não autorizado')
 *   - ActionResult<T> / ok() / fail() como contrato de retorno
 *   - logAudit em todas as mutações
 *   - revalidatePath para refrescar as páginas admin
 *
 * Campos calculados (totalSpent, visitCount, averageTicket,
 * loyaltyPoints, lastVisit) NÃO são tocados aqui.
 *
 * "delete" é soft (active=false) — clientes são referenciados por
 * transações e reservas; nunca se apaga a fila.
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { Client, logAudit } from '@/lib/models';
import { ok, fail, type ActionResult, type Paginated } from '@/types/common';
import {
  createClientSchema,
  updateClientSchema,
  setClientBlockSchema,
  listClientsSchema,
  clientIdSchema,
} from '@/lib/validation/client';

// ============================================================
// DTOs
// ============================================================

export type ClientListItem = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  visitCount: number;
  averageTicket: number;
  loyaltyPoints: number;
  lastVisit?: string;
  tags: string[];
  blocked: boolean;
  active: boolean;
  isVip: boolean;
};

export type ClientFiscal = {
  vatNumber?: string;
  fullLegalName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: string;
};

export type ClientDetail = ClientListItem & {
  birthday?: string;
  fiscalData?: ClientFiscal;
  preferredStaffId?: string;
  preferredInvoiceEmail?: string;
  notes?: string;
  source: string;
  referredBy?: string;
  blockedReason?: string;
  marketingConsent: boolean;
  createdAt: string;
  updatedAt: string;
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

const VIP_THRESHOLD_CENTS = 50000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toListItem(doc: any): ClientListItem {
  return {
    id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    totalSpent: doc.totalSpent ?? 0,
    visitCount: doc.visitCount ?? 0,
    averageTicket: doc.averageTicket ?? 0,
    loyaltyPoints: doc.loyaltyPoints ?? 0,
    lastVisit: doc.lastVisit ? new Date(doc.lastVisit).toISOString() : undefined,
    tags: doc.tags ?? [],
    blocked: Boolean(doc.blocked),
    active: doc.active !== false,
    isVip: (doc.totalSpent ?? 0) >= VIP_THRESHOLD_CENTS || (doc.tags ?? []).includes('VIP'),
  };
}

function toDetail(doc: any): ClientDetail {
  return {
    ...toListItem(doc),
    birthday: doc.birthday ? new Date(doc.birthday).toISOString() : undefined,
    fiscalData: doc.fiscalData
      ? {
          vatNumber: doc.fiscalData.vatNumber,
          fullLegalName: doc.fiscalData.fullLegalName,
          address: doc.fiscalData.address,
          postalCode: doc.fiscalData.postalCode,
          city: doc.fiscalData.city,
          country: doc.fiscalData.country ?? 'PT',
        }
      : undefined,
    preferredStaffId: doc.preferredStaffId ? String(doc.preferredStaffId) : undefined,
    preferredInvoiceEmail: doc.preferredInvoiceEmail,
    notes: doc.notes,
    source: doc.source,
    referredBy: doc.referredBy ? String(doc.referredBy) : undefined,
    blockedReason: doc.blockedReason,
    marketingConsent: Boolean(doc.marketingConsent),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// CREATE
// ============================================================

export async function createClientAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;

  try {
    const client = await Client.create({
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthday: data.birthday,
      fiscalData: data.fiscalData,
      preferredStaffId: data.preferredStaffId,
      preferredInvoiceEmail: data.preferredInvoiceEmail,
      notes: data.notes,
      source: data.source,
      referredBy: data.referredBy,
      tags: data.tags,
      marketingConsent: data.marketingConsent,
      active: true,
    });

    await logAudit({
      action: 'create',
      resource: 'client',
      resourceId: String(client._id),
      resourceLabel: client.name,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Cliente criado: ${client.name}`,
      severity: 'info',
    });

    revalidatePath('/admin/clientes');
    return ok({ id: String(client._id) });
  } catch (err) {
    console.error('[createClientAction]', err);
    return fail('server', 'Erro ao criar cliente');
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateClientAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { id, ...data } = parsed.data;
  const client = await Client.findById(id);
  if (!client) return fail('not_found', 'Cliente não encontrado');

  // Aplicar apenas os campos fornecidos (update parcial)
  if (data.name !== undefined) client.name = data.name;
  if (data.phone !== undefined) client.phone = data.phone;
  if (data.email !== undefined) client.email = data.email;
  if (data.birthday !== undefined) client.birthday = data.birthday;
  if (data.fiscalData !== undefined) client.set('fiscalData', data.fiscalData);
  if (data.preferredStaffId !== undefined) {
    client.preferredStaffId = data.preferredStaffId
      ? new mongoose.Types.ObjectId(data.preferredStaffId)
      : undefined;
  }
  if (data.preferredInvoiceEmail !== undefined)
    client.preferredInvoiceEmail = data.preferredInvoiceEmail;
  if (data.notes !== undefined) client.notes = data.notes;
  if (data.source !== undefined) client.source = data.source;
  if (data.referredBy !== undefined) {
    client.referredBy = data.referredBy ? new mongoose.Types.ObjectId(data.referredBy) : undefined;
  }
  if (data.tags !== undefined) client.tags = data.tags;
  if (data.marketingConsent !== undefined) client.marketingConsent = data.marketingConsent;

  try {
    await client.save();
  } catch (err) {
    console.error('[updateClientAction]', err);
    return fail('server', 'Erro ao atualizar cliente');
  }

  await logAudit({
    action: 'update',
    resource: 'client',
    resourceId: String(client._id),
    resourceLabel: client.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Cliente atualizado: ${client.name}`,
    severity: 'info',
  });

  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${String(client._id)}`);
  return ok({ id: String(client._id) });
}

// ============================================================
// BLOQUEAR / DESBLOQUEAR
// ============================================================

export async function setClientBlockAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = setClientBlockSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { id, blocked, reason } = parsed.data;
  const client = await Client.findById(id);
  if (!client) return fail('not_found', 'Cliente não encontrado');

  client.blocked = blocked;
  client.blockedReason = blocked ? reason : undefined;

  try {
    await client.save();
  } catch (err) {
    console.error('[setClientBlockAction]', err);
    return fail('server', 'Erro ao alterar bloqueio');
  }

  await logAudit({
    action: 'update',
    resource: 'client',
    resourceId: String(client._id),
    resourceLabel: client.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Cliente ${blocked ? 'bloqueado' : 'desbloqueado'}: ${client.name}`,
    severity: blocked ? 'warning' : 'info',
    metadata: { blocked, reason },
  });

  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${String(client._id)}`);
  return ok(undefined);
}

// ============================================================
// DELETE (soft)
// ============================================================

export async function deleteClientAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = clientIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const client = await Client.findById(parsed.data.id);
  if (!client) return fail('not_found', 'Cliente não encontrado');

  client.active = false;
  await client.save();

  await logAudit({
    action: 'delete',
    resource: 'client',
    resourceId: String(client._id),
    resourceLabel: client.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Cliente desativado: ${client.name}`,
    severity: 'warning',
  });

  revalidatePath('/admin/clientes');
  return ok(undefined);
}

// ============================================================
// GET (detalhe)
// ============================================================

export async function getClientAction(input: unknown): Promise<ActionResult<ClientDetail>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = clientIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const client = await Client.findById(parsed.data.id).lean();
  if (!client) return fail('not_found', 'Cliente não encontrado');

  return ok(toDetail(client));
}

// ============================================================
// LIST (paginado + filtros)
// ============================================================

export async function listClientsAction(
  input: unknown,
): Promise<ActionResult<Paginated<ClientListItem>>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = listClientsSchema.safeParse(input ?? {});
  if (!parsed.success) return fail('validation', 'Filtros inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { page, pageSize, search, tag, blocked, active, sort } = parsed.data;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const query: Record<string, any> = {};
  if (active !== undefined) query.active = active;
  if (blocked !== undefined) query.blocked = blocked;
  if (tag) query.tags = tag;
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { lastVisit: -1, createdAt: -1 },
    name: { name: 1 },
    totalSpent: { totalSpent: -1 },
    visits: { visitCount: -1 },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [docs, total] = await Promise.all([
    Client.find(query)
      .sort(sortMap[sort])
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Client.countDocuments(query),
  ]);

  return ok({
    items: docs.map(toListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
