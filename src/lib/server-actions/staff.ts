// ðŸ“„ src/lib/server-actions/staff.ts
'use server';

/**
 * Chi Sublime â€” Server Actions: Equipa
 * ============================================================
 *
 * CRUD da equipa + editores dedicados de horÃ¡rio semanal
 * (workingHours) e de fÃ©rias (vacations), que alimentam o cÃ¡lculo
 * de disponibilidade.
 *
 * O slug Ã© gerado na action (mesma razÃ£o que services.ts: o
 * pre('save') corre depois da validaÃ§Ã£o e o slug Ã© required).
 * "delete" Ã© HARD (remove o documento) com salvaguardas:
 *   - bloqueia se existirem reservas futuras ativas (pending/
 *     confirmed/in-progress) â€” tÃªm de ser canceladas/reatribuÃ­das;
 *   - limpa referÃªncias vivas (Service.staffIds e
 *     Client.preferredStaffId);
 *   - reservas/transaÃ§Ãµes histÃ³ricas mantÃªm o ObjectId Ã³rfÃ£o â€”
 *     os formatters jÃ¡ tratam populate null ("staff: null").
 * Para afastar temporariamente um membro, usar o toggle
 * "Membro ativo" no formulÃ¡rio de ediÃ§Ã£o (soft via update).
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import {
  Staff,
  Booking,
  Service,
  Client,
  SLOT_BLOCKING_STATUSES,
  WEEKDAYS,
  slugify,
  logAudit,
  type WeekDay,
} from '@/lib/models';
import { ok, fail, type ActionResult, type Paginated } from '@/types/common';
import {
  createStaffSchema,
  updateStaffSchema,
  listStaffSchema,
  staffIdSchema,
  setWorkingHoursSchema,
  setVacationsSchema,
} from '@/lib/validation/staff';
import { SALON_DEFAULT_END, SALON_DEFAULT_START } from '@/lib/constants/business';

// ============================================================
// DTOs
// ============================================================

type WorkBreakDTO = { start: string; end: string };
type WorkDayDTO = { enabled: boolean; start: string; end: string; breaks: WorkBreakDTO[] };
export type WorkingHoursDTO = Record<WeekDay, WorkDayDTO>;

export type StaffListItem = {
  id: string;
  name: string;
  slug: string;
  role: { pt: string; en?: string };
  photo?: string;
  specialties: string[];
  order: number;
  active: boolean;
  showOnWebsite: boolean;
};

export type StaffDetail = StaffListItem & {
  bio?: { pt?: string; en?: string };
  specialty?: { pt?: string; en?: string };
  email?: string;
  phone?: string;
  commissionRate?: number;
  workingHours: WorkingHoursDTO;
  vacations: Array<{ from: string; to: string; reason?: string }>;
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

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

const DEFAULT_DAY: WorkDayDTO = {
  enabled: false,
  start: SALON_DEFAULT_START,
  end: SALON_DEFAULT_END,
  breaks: [],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeWorkingHours(raw: any): WorkingHoursDTO {
  const out = {} as WorkingHoursDTO;
  for (const day of WEEKDAYS) {
    const d = raw?.[day];
    out[day] = d
      ? {
          enabled: Boolean(d.enabled),
          start: d.start ?? SALON_DEFAULT_START,
          end: d.end ?? SALON_DEFAULT_END,
          breaks: (d.breaks ?? []).map((b: any) => ({ start: b.start, end: b.end })),
        }
      : { ...DEFAULT_DAY };
  }
  return out;
}

function toListItem(doc: any): StaffListItem {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    role: { pt: doc.role?.pt ?? '', en: doc.role?.en },
    photo: doc.photo,
    specialties: doc.specialties ?? [],
    order: doc.order ?? 0,
    active: doc.active !== false,
    // Documentos antigos nÃ£o tÃªm o campo â†’ visÃ­veis por defeito
    showOnWebsite: doc.showOnWebsite !== false,
  };
}

function toDetail(doc: any): StaffDetail {
  return {
    ...toListItem(doc),
    bio: doc.bio ? { pt: doc.bio.pt, en: doc.bio.en } : undefined,
    specialty: doc.specialty ? { pt: doc.specialty.pt, en: doc.specialty.en } : undefined,
    email: doc.email,
    phone: doc.phone,
    commissionRate: doc.commissionRate,
    workingHours: normalizeWorkingHours(doc.workingHours),
    vacations: (doc.vacations ?? []).map((v: any) => ({
      from: new Date(v.from).toISOString(),
      to: new Date(v.to).toISOString(),
      reason: v.reason,
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// REVALIDAÃ‡ÃƒO DO SITE PÃšBLICO
// ============================================================

/**
 * Nome, foto, funÃ§Ã£o, ordem e visibilidade aparecem na homepage
 * (TeamPreview), no perfil /equipa/[slug] e no fluxo de reserva.
 * Se o slug mudou, o perfil antigo tambÃ©m Ã© invalidado.
 */
function revalidatePublicTeam(slug: string, previousSlug?: string) {
  revalidatePath('/');
  revalidatePath('/marcacoes');
  revalidatePath(`/equipa/${slug}`);
  if (previousSlug && previousSlug !== slug) revalidatePath(`/equipa/${previousSlug}`);
}

// ============================================================
// CREATE
// ============================================================

export async function createStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados invÃ¡lidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);

  try {
    const staff = await Staff.create({
      name: data.name,
      slug,
      role: data.role,
      bio: data.bio,
      specialty: data.specialty,
      photo: data.photo,
      specialties: data.specialties,
      email: data.email,
      phone: data.phone,
      workingHours: data.workingHours,
      vacations: data.vacations,
      commissionRate: data.commissionRate,
      order: data.order,
      active: data.active,
      showOnWebsite: data.showOnWebsite,
    });

    await logAudit({
      action: 'create',
      resource: 'staff',
      resourceId: String(staff._id),
      resourceLabel: staff.name,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Membro da equipa criado: ${staff.name}`,
      severity: 'info',
    });

    revalidatePath('/admin/equipa');
    revalidatePublicTeam(staff.slug);
    return ok({ id: String(staff._id) });
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'JÃ¡ existe um membro com esse slug');
    console.error('[createStaffAction]', err);
    return fail('server', 'Erro ao criar membro da equipa');
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados invÃ¡lidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const { id, ...data } = parsed.data;
  const staff = await Staff.findById(id);
  if (!staff) return fail('not_found', 'Membro nÃ£o encontrado');

  const previousSlug = staff.slug;

  if (data.name !== undefined) staff.name = data.name;
  if (data.slug !== undefined) staff.slug = data.slug || slugify(data.name ?? staff.name);
  if (data.role !== undefined) staff.set('role', data.role);
  if (data.bio !== undefined) staff.set('bio', data.bio);
  if (data.specialty !== undefined) staff.set('specialty', data.specialty);
  if (data.photo !== undefined) staff.photo = data.photo;
  if (data.specialties !== undefined) staff.specialties = data.specialties;
  if (data.email !== undefined) staff.email = data.email;
  if (data.phone !== undefined) staff.phone = data.phone;
  if (data.workingHours !== undefined) staff.set('workingHours', data.workingHours);
  if (data.vacations !== undefined) staff.set('vacations', data.vacations);
  if (data.commissionRate !== undefined) staff.commissionRate = data.commissionRate;
  if (data.order !== undefined) staff.order = data.order;
  if (data.active !== undefined) staff.active = data.active;
  if (data.showOnWebsite !== undefined) staff.showOnWebsite = data.showOnWebsite;

  try {
    await staff.save();
  } catch (err) {
    if (isDuplicateKey(err)) return fail('duplicate', 'JÃ¡ existe um membro com esse slug');
    if (err instanceof Error && /HorÃ¡rio|Break|fÃ©rias/i.test(err.message)) {
      return fail('validation', err.message);
    }
    console.error('[updateStaffAction]', err);
    return fail('server', 'Erro ao atualizar membro');
  }

  await logAudit({
    action: 'update',
    resource: 'staff',
    resourceId: String(staff._id),
    resourceLabel: staff.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Membro atualizado: ${staff.name}`,
    severity: 'info',
  });

  revalidatePath('/admin/equipa');
  revalidatePath(`/admin/equipa/${String(staff._id)}`);
  revalidatePublicTeam(staff.slug, previousSlug);
  return ok({ id: String(staff._id) });
}

// ============================================================
// DELETE (hard â€” remove o documento)
// ============================================================

export async function deleteStaffAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID invÃ¡lido.');

  await connectDB();

  const staff = await Staff.findById(parsed.data.id);
  if (!staff) return fail('not_found', 'Membro nÃ£o encontrado');

  // Salvaguarda: nÃ£o eliminar com reservas futuras ativas â€”
  // ficariam na agenda sem profissional atribuÃ­do.
  const futureBookings = await Booking.countDocuments({
    staffId: staff._id,
    status: { $in: SLOT_BLOCKING_STATUSES },
    startTime: { $gte: new Date() },
  });
  if (futureBookings > 0) {
    return fail(
      'conflict',
      `${staff.name} tem ${futureBookings} reserva(s) futura(s) ativa(s). ` +
        'Cancela ou reatribui essas reservas antes de eliminar, ou desativa o membro na ediÃ§Ã£o do perfil.',
    );
  }

  const staffName = staff.name;
  const staffId = staff._id;

  try {
    // Limpar referÃªncias vivas antes de remover o documento.
    await Promise.all([
      Service.updateMany({ staffIds: staffId }, { $pull: { staffIds: staffId } }),
      Client.updateMany({ preferredStaffId: staffId }, { $unset: { preferredStaffId: 1 } }),
    ]);

    await Staff.deleteOne({ _id: staffId });
  } catch (err) {
    console.error('[deleteStaffAction]', err);
    return fail('server', 'Erro ao eliminar membro da equipa');
  }

  await logAudit({
    action: 'delete',
    resource: 'staff',
    resourceId: String(staffId),
    resourceLabel: staffName,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Membro eliminado permanentemente: ${staffName}`,
    severity: 'warning',
  });

  revalidatePath('/admin/equipa');
  revalidatePath('/');
  revalidatePath('/marcacoes');
  revalidatePath(`/equipa/${staff.slug}`);
  return ok(undefined);
}

// ============================================================
// GET / LIST
// ============================================================

export async function getStaffAction(input: unknown): Promise<ActionResult<StaffDetail>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'ID invÃ¡lido.');

  await connectDB();

  const staff = await Staff.findById(parsed.data.id).lean();
  if (!staff) return fail('not_found', 'Membro nÃ£o encontrado');

  return ok(toDetail(staff));
}

export async function listStaffAction(
  input: unknown,
): Promise<ActionResult<Paginated<StaffListItem>>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = listStaffSchema.safeParse(input ?? {});
  if (!parsed.success) return fail('validation', 'Filtros invÃ¡lidos.', fieldErrors(parsed.error));

  await connectDB();

  const { page, pageSize, search, active } = parsed.data;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const query: Record<string, any> = {};
  if (active !== undefined) query.active = active;
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.name = new RegExp(safe, 'i');
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [docs, total] = await Promise.all([
    Staff.find(query)
      .sort({ order: 1, name: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Staff.countDocuments(query),
  ]);

  return ok({
    items: docs.map(toListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// ============================================================
// EDITORES DEDICADOS
// ============================================================

export async function setWorkingHoursAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = setWorkingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'HorÃ¡rio invÃ¡lido.', fieldErrors(parsed.error));
  }

  await connectDB();

  const staff = await Staff.findById(parsed.data.id);
  if (!staff) return fail('not_found', 'Membro nÃ£o encontrado');

  staff.set('workingHours', parsed.data.workingHours);

  try {
    await staff.save();
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    return fail('server', 'Erro ao gravar horÃ¡rio');
  }

  await logAudit({
    action: 'update',
    resource: 'staff',
    resourceId: String(staff._id),
    resourceLabel: staff.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `HorÃ¡rio atualizado: ${staff.name}`,
    severity: 'info',
  });

  revalidatePath('/admin/equipa');
  revalidatePath(`/admin/equipa/${String(staff._id)}`);
  return ok(undefined);
}

export async function setVacationsAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'NÃ£o autorizado');

  const parsed = setVacationsSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'FÃ©rias invÃ¡lidas.', fieldErrors(parsed.error));
  }

  await connectDB();

  const staff = await Staff.findById(parsed.data.id);
  if (!staff) return fail('not_found', 'Membro nÃ£o encontrado');

  staff.set('vacations', parsed.data.vacations);

  try {
    await staff.save();
  } catch (err) {
    if (err instanceof Error) return fail('validation', err.message);
    return fail('server', 'Erro ao gravar fÃ©rias');
  }

  await logAudit({
    action: 'update',
    resource: 'staff',
    resourceId: String(staff._id),
    resourceLabel: staff.name,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `FÃ©rias atualizadas: ${staff.name} (${parsed.data.vacations.length} perÃ­odo(s))`,
    severity: 'info',
  });

  revalidatePath('/admin/equipa');
  revalidatePath(`/admin/equipa/${String(staff._id)}`);
  return ok(undefined);
}
