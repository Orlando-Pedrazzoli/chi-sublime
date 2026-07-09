'use server';

/**
 * Chi Sublime — Server Actions: Serviços e Categorias
 * ============================================================
 *
 * CRUD de serviços e das categorias de serviço, mais atualização
 * de preços em massa.
 *
 * Notas:
 *   - O slug é gerado NA action (o pre('save') do model corre depois
 *     da validação, e slug é required — se não o gerássemos aqui, um
 *     create sem slug falhava na validação antes do hook).
 *   - Preços em cêntimos. priceWithVat é derivado (não persistido).
 *   - "delete" de serviço é soft (active=false). Categoria só se apaga
 *     se não tiver serviços associados; caso contrário, desativa-se.
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { Service, Category, slugify, logAudit } from '@/lib/models';
import { ok, fail, type ActionResult, type Paginated } from '@/types/common';
import {
  createServiceSchema,
  updateServiceSchema,
  listServicesSchema,
  serviceIdSchema,
  bulkPriceUpdateSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from '@/lib/validation/service';

// ============================================================
// DTOs
// ============================================================

export type ServiceListItem = {
  id: string;
  name: { pt: string; en?: string };
  slug: string;
  categoryId: string;
  categoryName?: string;
  duration: number;
  price: number;
  priceWithVat: number;
  vatRate: number;
  bufferAfter: number;
  staffIds: string[];
  requiresDeposit: boolean;
  depositAmount: number;
  order: number;
  active: boolean;
  popular: boolean;
  image?: string;
};

export type ServiceDetail = ServiceListItem & {
  description?: { pt?: string; en?: string };
  createdAt: string;
  updatedAt: string;
};

export type CategoryListItem = {
  id: string;
  name: { pt: string; en?: string };
  slug: string;
  description?: { pt?: string; en?: string };
  icon?: string;
  color?: string;
  order: number;
  active: boolean;
  serviceCount: number;
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

function priceWithVat(price: number, vatRate: number): number {
  return Math.round(price * (1 + vatRate / 100));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toServiceListItem(doc: any): ServiceListItem {
  const category = doc.categoryId && typeof doc.categoryId === 'object' ? doc.categoryId : null;
  return {
    id: String(doc._id),
    name: { pt: doc.name?.pt ?? '', en: doc.name?.en },
    slug: doc.slug,
    categoryId: category ? String(category._id) : String(doc.categoryId),
    categoryName: category?.name?.pt,
    duration: doc.duration,
    price: doc.price,
    priceWithVat: priceWithVat(doc.price, doc.vatRate),
    vatRate: doc.vatRate,
    bufferAfter: doc.bufferAfter ?? 0,
    staffIds: (doc.staffIds ?? []).map((s: any) => String(s)),
    requiresDeposit: Boolean(doc.requiresDeposit),
    depositAmount: doc.depositAmount ?? 0,
    order: doc.order ?? 0,
    active: doc.active !== false,
    popular: Boolean(doc.popular),
    image: doc.image,
  };
}

function toServiceDetail(doc: any): ServiceDetail {
  return {
    ...toServiceListItem(doc),
    description: doc.description ? { pt: doc.description.pt, en: doc.description.en } : undefined,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// SERVICE — CREATE
// ============================================================

export async function createServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;

  // A categoria tem de existir
  const category = await Category.findById(data.categoryId).lean();
  if (!category) return fail('not_found', 'Categoria não encontrada');

  const slug = data.slug || slugify(data.name.pt);

  try {
    const service = await Service.create({
      categoryId: data.categoryId,
      name: data.name,
      slug,
      description: data.description,
      duration: data.duration,
      price: data.price,
      vatRate: data.vatRate,
      bufferAfter: data.bufferAfter,
      staffIds: data.staffIds,
      image: data.image,
      requiresDeposit: data.requiresDeposit,
      depositAmount: data.depositAmount,
      order: data.order,
      active: data.active,
      popular: data.popular,
    });

    await logAudit({
      action: 'create',
      resource: 'service',
      resourceId: String(service._id),
      resourceLabel: service.name.pt,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Serviço criado: ${service.name.pt}`,
      severity: 'info',
    });

    revalidatePath('/admin/servicos');
    return ok({ id: String(service._id) });
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe um serviço com esse slug');
    console.error('[createServiceAction]', err);
    return fail('server', 'Erro ao criar serviço');
  }
}

// ============================================================
// SERVICE — UPDATE
// ============================================================

export async function updateServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { id, ...data } = parsed.data;
  const service = await Service.findById(id);
  if (!service) return fail('not_found', 'Serviço não encontrado');

  if (data.categoryId !== undefined) {
    const category = await Category.findById(data.categoryId).lean();
    if (!category) return fail('not_found', 'Categoria não encontrada');
    service.categoryId = new mongoose.Types.ObjectId(data.categoryId);
  }
  if (data.name !== undefined) service.set('name', data.name);
  if (data.slug !== undefined)
    service.slug = data.slug || slugify(data.name?.pt ?? service.name.pt);
  if (data.description !== undefined) service.set('description', data.description);
  if (data.duration !== undefined) service.duration = data.duration;
  if (data.price !== undefined) service.price = data.price;
  if (data.vatRate !== undefined) service.vatRate = data.vatRate;
  if (data.bufferAfter !== undefined) service.bufferAfter = data.bufferAfter;
  if (data.staffIds !== undefined) {
    service.staffIds = data.staffIds.map((s) => new mongoose.Types.ObjectId(s));
  }
  if (data.image !== undefined) service.image = data.image;
  if (data.requiresDeposit !== undefined) service.requiresDeposit = data.requiresDeposit;
  if (data.depositAmount !== undefined) service.depositAmount = data.depositAmount;
  if (data.order !== undefined) service.order = data.order;
  if (data.active !== undefined) service.active = data.active;
  if (data.popular !== undefined) service.popular = data.popular;

  try {
    await service.save();
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe um serviço com esse slug');
    console.error('[updateServiceAction]', err);
    return fail('server', 'Erro ao atualizar serviço');
  }

  await logAudit({
    action: 'update',
    resource: 'service',
    resourceId: String(service._id),
    resourceLabel: service.name.pt,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Serviço atualizado: ${service.name.pt}`,
    severity: 'info',
  });

  revalidatePath('/admin/servicos');
  return ok({ id: String(service._id) });
}

// ============================================================
// SERVICE — DELETE (soft)
// ============================================================

export async function deleteServiceAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = serviceIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const service = await Service.findById(parsed.data.id);
  if (!service) return fail('not_found', 'Serviço não encontrado');

  service.active = false;
  await service.save();

  await logAudit({
    action: 'delete',
    resource: 'service',
    resourceId: String(service._id),
    resourceLabel: service.name.pt,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Serviço desativado: ${service.name.pt}`,
    severity: 'warning',
  });

  revalidatePath('/admin/servicos');
  return ok(undefined);
}

// ============================================================
// SERVICE — GET / LIST
// ============================================================

export async function getServiceAction(input: unknown): Promise<ActionResult<ServiceDetail>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = serviceIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const service = await Service.findById(parsed.data.id).populate('categoryId', 'name slug').lean();
  if (!service) return fail('not_found', 'Serviço não encontrado');

  return ok(toServiceDetail(service));
}

export async function listServicesAction(
  input: unknown,
): Promise<ActionResult<Paginated<ServiceListItem>>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = listServicesSchema.safeParse(input ?? {});
  if (!parsed.success) return fail('validation', 'Filtros inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { page, pageSize, categoryId, search, active, popular } = parsed.data;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const query: Record<string, any> = {};
  if (categoryId) query.categoryId = categoryId;
  if (active !== undefined) query.active = active;
  if (popular !== undefined) query.popular = popular;
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query['name.pt'] = new RegExp(safe, 'i');
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [docs, total] = await Promise.all([
    Service.find(query)
      .sort({ order: 1, 'name.pt': 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('categoryId', 'name slug')
      .lean(),
    Service.countDocuments(query),
  ]);

  return ok({
    items: docs.map(toServiceListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// ============================================================
// SERVICE — BULK PRICE UPDATE
// ============================================================

export async function bulkPriceUpdateAction(
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = bulkPriceUpdateSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { categoryId, serviceIds, mode, value, roundTo } = parsed.data;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const query: Record<string, any> = { active: true };
  if (serviceIds && serviceIds.length > 0) query._id = { $in: serviceIds };
  else if (categoryId) query.categoryId = categoryId;
  else return fail('validation', 'Indica uma categoria ou uma lista de serviços');
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const services = await Service.find(query);
  if (services.length === 0) return ok({ updated: 0 });

  const roundCents = (n: number) => Math.max(0, Math.round(n / roundTo) * roundTo);

  let updated = 0;
  for (const service of services) {
    const next =
      mode === 'fixed' ? roundCents(value) : roundCents(service.price * (1 + value / 100));
    if (next !== service.price) {
      service.price = next;
      await service.save();
      updated += 1;
    }
  }

  await logAudit({
    action: 'update',
    resource: 'service',
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Atualização de preços em massa: ${updated} serviço(s) (${mode} ${value})`,
    severity: 'warning',
    metadata: { mode, value, roundTo, updated, categoryId, serviceIds },
  });

  revalidatePath('/admin/servicos');
  return ok({ updated });
}

// ============================================================
// CATEGORY — CREATE / UPDATE / DELETE / LIST
// ============================================================

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;
  const slug = data.slug || slugify(data.name.pt);

  try {
    const category = await Category.create({
      name: data.name,
      slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      order: data.order,
      active: data.active,
    });

    await logAudit({
      action: 'create',
      resource: 'service',
      resourceId: String(category._id),
      resourceLabel: category.name.pt,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Categoria criada: ${category.name.pt}`,
      severity: 'info',
    });

    revalidatePath('/admin/servicos/categorias');
    revalidatePath('/admin/servicos');
    return ok({ id: String(category._id) });
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    console.error('[createCategoryAction]', err);
    return fail('server', 'Erro ao criar categoria');
  }
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));

  await connectDB();

  const { id, ...data } = parsed.data;
  const category = await Category.findById(id);
  if (!category) return fail('not_found', 'Categoria não encontrada');

  if (data.name !== undefined) category.set('name', data.name);
  if (data.slug !== undefined)
    category.slug = data.slug || slugify(data.name?.pt ?? category.name.pt);
  if (data.description !== undefined) category.set('description', data.description);
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.color !== undefined) category.color = data.color;
  if (data.order !== undefined) category.order = data.order;
  if (data.active !== undefined) category.active = data.active;

  try {
    await category.save();
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'Já existe uma categoria com esse slug');
    console.error('[updateCategoryAction]', err);
    return fail('server', 'Erro ao atualizar categoria');
  }

  await logAudit({
    action: 'update',
    resource: 'service',
    resourceId: String(category._id),
    resourceLabel: category.name.pt,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Categoria atualizada: ${category.name.pt}`,
    severity: 'info',
  });

  revalidatePath('/admin/servicos/categorias');
  revalidatePath('/admin/servicos');
  return ok({ id: String(category._id) });
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID inválido.');

  await connectDB();

  const category = await Category.findById(parsed.data.id);
  if (!category) return fail('not_found', 'Categoria não encontrada');

  const serviceCount = await Service.countDocuments({ categoryId: category._id });
  if (serviceCount > 0) {
    // Não apagar categoria com serviços — desativar em vez disso.
    category.active = false;
    await category.save();

    await logAudit({
      action: 'update',
      resource: 'service',
      resourceId: String(category._id),
      resourceLabel: category.name.pt,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Categoria desativada (tinha ${serviceCount} serviço(s)): ${category.name.pt}`,
      severity: 'warning',
    });

    revalidatePath('/admin/servicos/categorias');
    return ok(undefined);
  }

  await category.deleteOne();

  await logAudit({
    action: 'delete',
    resource: 'service',
    resourceId: String(category._id),
    resourceLabel: category.name.pt,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Categoria apagada: ${category.name.pt}`,
    severity: 'warning',
  });

  revalidatePath('/admin/servicos/categorias');
  return ok(undefined);
}

export async function listCategoriesAction(): Promise<ActionResult<CategoryListItem[]>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  await connectDB();

  const categories = await Category.find({}).sort({ order: 1 }).lean();

  const counts = await Service.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: CategoryListItem[] = categories.map((c: any) => ({
    id: String(c._id),
    name: { pt: c.name?.pt ?? '', en: c.name?.en },
    slug: c.slug,
    description: c.description ? { pt: c.description.pt, en: c.description.en } : undefined,
    icon: c.icon,
    color: c.color,
    order: c.order ?? 0,
    active: c.active !== false,
    serviceCount: countMap.get(String(c._id)) ?? 0,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return ok(items);
}
