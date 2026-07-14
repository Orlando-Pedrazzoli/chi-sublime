// 📄 src/lib/server-actions/manual-bookings.ts
'use server';

/**
 * Chi Sublime — Server Actions: Reservas manuais (admin)
 * ============================================================
 *
 * Implementa os 3 stubs documentados em bookings.ts:
 *  - createManualBookingAction  (telefone, walk-in, Instagram,
 *    e recriação das reservas futuras na migração do Noona)
 *  - adminCancelBookingAction   (sem janela de 24h)
 *  - updateBookingStatusAction  (confirmar / iniciar / concluir / falta)
 *
 * Padrão do projeto (staff.ts): requireAdminSession, Zod +
 * fieldErrors, ok/fail, logAudit, revalidatePath.
 *
 * Política do `force` na criação manual:
 *  - force=false (default): o horário tem de existir na grelha
 *    real de disponibilidade (mesma verificação do site público).
 *  - force=true: salta horário do salão/staff e grelha de 30min
 *    (walk-in às 18:50, encaixe especial), MAS a sobreposição
 *    com reservas existentes é SEMPRE verificada + protegida
 *    pelo índice único anti-double-booking (E11000).
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import {
  Booking,
  Client,
  Service,
  Staff,
  generateBookingNumber,
  logAudit,
  SLOT_BLOCKING_STATUSES,
} from '@/lib/models';
import {
  getAvailableSlots,
  validateDate,
  calculateTotalDuration,
} from '@/lib/booking/availability';
import { combineDateAndTime, minutesToTime, timeToMinutes } from '@/lib/utils/time-utils';
import { ok, fail, type ActionResult } from '@/types/common';
import {
  createManualBookingSchema,
  adminCancelBookingSchema,
  updateBookingStatusSchema,
} from '@/lib/validation/manual-booking';

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

function parseDateString(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

function revalidateBookingViews() {
  revalidatePath('/admin/reservas');
  revalidatePath('/admin/dashboard');
}

// ============================================================
// CREATE MANUAL BOOKING
// ============================================================

export type ManualBookingCreated = {
  id: string;
  bookingNumber: string;
  startTime: string;
  endTime: string;
  staffName: string;
  clientName: string;
  totalPrice: number;
  totalDuration: number;
};

export async function createManualBookingAction(
  input: unknown,
): Promise<ActionResult<ManualBookingCreated>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createManualBookingSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos. Verifica os campos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const data = parsed.data;
  const dateObj = parseDateString(data.date);

  // Nunca criar reservas em dias passados, mesmo com force
  const dateError = validateDate(dateObj);
  if (dateError && dateError.code === 'no-past') {
    return fail('validation', dateError.message);
  }

  // ----------------------------------------------------------
  // Staff + serviços
  // ----------------------------------------------------------

  const staff = await Staff.findOne({ _id: data.staffId, active: true }).lean();
  if (!staff) return fail('not_found', 'Profissional não encontrado ou inativo');

  const services = await Service.find({ _id: { $in: data.serviceIds }, active: true }).lean();
  if (services.length !== data.serviceIds.length) {
    return fail('validation', 'Um ou mais serviços não foram encontrados ou estão inativos');
  }

  // Manter a ordem escolhida pelo admin
  const orderedServices = data.serviceIds.map(
    (sid) => services.find((s) => String(s._id) === sid)!,
  );

  const totalDuration = calculateTotalDuration(orderedServices);
  const startTime = combineDateAndTime(dateObj, data.time);
  const endTime = combineDateAndTime(
    dateObj,
    minutesToTime(timeToMinutes(data.time) + totalDuration),
  );

  // ----------------------------------------------------------
  // Validação de horário (saltável com force)
  // ----------------------------------------------------------

  if (!data.force) {
    const availability = await getAvailableSlots({
      date: dateObj,
      serviceIds: data.serviceIds,
      staffId: data.staffId,
    });

    if (availability.error) {
      return fail('validation', availability.error.message);
    }
    if (!availability.metadata.salonOpen) {
      return fail(
        'validation',
        availability.metadata.closedReasonDetail ?? 'Salão encerrado nesta data',
      );
    }
    const slotExists = availability.slots.some(
      (s) => s.time === data.time && s.staffId === data.staffId,
    );
    if (!slotExists) {
      return fail(
        'validation',
        'Este horário não está disponível para este profissional. ' +
          'Usa "Forçar encaixe" para agendar fora do horário normal.',
      );
    }
  }

  // ----------------------------------------------------------
  // Sobreposição com reservas existentes — SEMPRE verificada
  // ----------------------------------------------------------

  const overlap = await Booking.findOne({
    staffId: data.staffId,
    status: { $in: SLOT_BLOCKING_STATUSES },
    $or: [
      { startTime: { $gte: startTime, $lt: endTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
    ],
  })
    .select('bookingNumber startTime')
    .lean();

  if (overlap) {
    return fail(
      'conflict',
      `Sobrepõe a reserva ${overlap.bookingNumber} deste profissional. Escolhe outro horário.`,
    );
  }

  // ----------------------------------------------------------
  // Resolver cliente (existente ou novo)
  // ----------------------------------------------------------

  let clientDoc = null;

  if (data.clientId) {
    clientDoc = await Client.findOne({ _id: data.clientId, active: true });
    if (!clientDoc) return fail('not_found', 'Cliente não encontrado ou inativo');
  } else if (data.newClient) {
    // Reutilizar se o telefone/email já existir (evita duplicados)
    const or: Record<string, string>[] = [{ phone: data.newClient.phone }];
    if (data.newClient.email) or.push({ email: data.newClient.email });

    clientDoc = await Client.findOne({ $or: or, active: true });

    if (!clientDoc) {
      try {
        clientDoc = await Client.create({
          name: data.newClient.name,
          phone: data.newClient.phone,
          ...(data.newClient.email ? { email: data.newClient.email } : {}),
        });
      } catch (err) {
        console.error('[createManualBookingAction] Falha ao criar cliente:', err);
        return fail('validation', 'Não foi possível criar o cliente. Verifica os dados.');
      }
    }
  }

  if (!clientDoc) return fail('validation', 'Cliente em falta');

  // ----------------------------------------------------------
  // Criar a reserva
  // ----------------------------------------------------------

  const serviceItems = orderedServices.map((s) => ({
    serviceId: s._id,
    name: s.name.pt,
    price: s.price,
    duration: s.duration,
    bufferAfter: s.bufferAfter ?? 0,
  }));

  const bookingNumber = await generateBookingNumber();

  try {
    const booking = await Booking.create({
      bookingNumber,
      clientId: clientDoc._id,
      staffId: staff._id,
      services: serviceItems,
      totalDuration,
      totalPrice: serviceItems.reduce((sum, s) => sum + s.price, 0),
      startTime,
      endTime,
      status: data.status,
      source: data.source,
      notes: data.notes,
      internalNotes: data.internalNotes,
      remindersSent: { confirmation: false, dayBefore: false, hourBefore: false },
      createdBy: new mongoose.Types.ObjectId(admin.id),
    });

    await logAudit({
      action: 'create',
      resource: 'booking',
      resourceId: String(booking._id),
      resourceLabel: bookingNumber,
      userId: new mongoose.Types.ObjectId(admin.id),
      userName: admin.name,
      userEmail: admin.email,
      userRole: 'admin',
      message: `Reserva manual (${data.source}): ${serviceItems.map((s) => s.name).join(', ')} com ${staff.name}${data.force ? ' [encaixe forçado]' : ''}`,
      severity: 'info',
      metadata: {
        bookingNumber,
        force: data.force,
        source: data.source,
        totalPrice: booking.totalPrice,
      },
    });

    revalidateBookingViews();

    return ok({
      id: String(booking._id),
      bookingNumber,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      staffName: staff.name,
      clientName: clientDoc.name,
      totalPrice: booking.totalPrice,
      totalDuration,
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      return fail('conflict', 'Este horário acabou de ser ocupado. Escolhe outro.');
    }
    console.error('[createManualBookingAction]', err);
    return fail('server', 'Erro ao criar a reserva. Tenta novamente.');
  }
}

// ============================================================
// ADMIN CANCEL (sem janela de 24h)
// ============================================================

export async function adminCancelBookingAction(
  input: unknown,
): Promise<ActionResult<{ bookingNumber: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = adminCancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const booking = await Booking.findById(parsed.data.id);
  if (!booking) return fail('not_found', 'Reserva não encontrada');

  if (booking.status === 'cancelled') {
    return fail('validation', 'A reserva já está cancelada');
  }
  if (booking.status === 'completed') {
    return fail('validation', 'Não é possível cancelar uma reserva concluída');
  }

  booking.status = 'cancelled';
  booking.cancellationReason = parsed.data.reason;
  booking.cancelledBy = 'staff';
  booking.cancelledAt = new Date();
  await booking.save();

  await logAudit({
    action: 'cancel',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: booking.bookingNumber,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Reserva ${booking.bookingNumber} cancelada pelo salão`,
    severity: 'warning',
    metadata: { reason: parsed.data.reason },
  });

  revalidateBookingViews();
  return ok({ bookingNumber: booking.bookingNumber });
}

// ============================================================
// UPDATE STATUS (confirmar / iniciar / concluir / falta)
// ============================================================

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'in-progress', 'completed', 'no-show'],
  confirmed: ['in-progress', 'completed', 'no-show'],
  'in-progress': ['completed', 'no-show'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

export async function updateBookingStatusAction(
  input: unknown,
): Promise<ActionResult<{ bookingNumber: string; status: string }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = updateBookingStatusSchema.safeParse(input);
  if (!parsed.success) {
    return fail('validation', 'Dados inválidos.', fieldErrors(parsed.error));
  }

  await connectDB();

  const booking = await Booking.findById(parsed.data.id);
  if (!booking) return fail('not_found', 'Reserva não encontrada');

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return fail(
      'validation',
      `Não é possível passar de "${booking.status}" para "${parsed.data.status}"`,
    );
  }

  const previous = booking.status;
  booking.status = parsed.data.status;
  await booking.save(); // pre-validate recalcula blocksSlot automaticamente

  await logAudit({
    action: 'update',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: booking.bookingNumber,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Reserva ${booking.bookingNumber}: ${previous} → ${parsed.data.status}`,
    severity: parsed.data.status === 'no-show' ? 'warning' : 'info',
  });

  revalidateBookingViews();
  return ok({ bookingNumber: booking.bookingNumber, status: booking.status });
}
