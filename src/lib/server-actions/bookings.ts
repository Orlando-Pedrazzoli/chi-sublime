'use server';

import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, generateBookingNumber, logAudit, type IBooking } from '@/lib/models';
import { auth } from '@/lib/auth';
import { getAvailableSlots } from '@/lib/booking/availability';
import { combineDateAndTime, timeToMinutes, minutesToTime } from '@/lib/utils/time-utils';
import {
  createBookingSchema,
  cancelBookingSchema,
  type CreateBookingInput,
  type CancelBookingInput,
} from '@/lib/validation/booking';

// ============================================================
// RATE LIMITING
// ============================================================

type RateLimitEntry = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  if (process.env.SKIP_RATE_LIMIT === 'true') return { allowed: true };
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

// ============================================================
// TIPOS
// ============================================================

export type CreateBookingResult =
  | {
      success: true;
      booking: {
        bookingNumber: string;
        startTime: Date;
        endTime: Date;
        totalDuration: number;
        totalPrice: number;
        staffName: string;
        cancellationToken: string;
      };
    }
  | {
      success: false;
      error: {
        code: 'validation' | 'slot-taken' | 'rate-limit' | 'no-services' | 'no-staff' | 'internal';
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export type CancelBookingResult =
  | { success: true; bookingNumber: string }
  | {
      success: false;
      error: {
        code: 'not-found' | 'invalid-token' | 'too-late' | 'already-cancelled' | 'internal';
        message: string;
      };
    };

export type BookingForClient = {
  bookingNumber: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalPrice: number;
  status: IBooking['status'];
  services: Array<{ name: string; price: number; duration: number }>;
  staff: { name: string; photo?: string } | null;
  isFuture: boolean;
  isCancellable: boolean;
  hoursUntil: number;
};

export type GetMyBookingsResult =
  | { success: true; bookings: BookingForClient[] }
  | { success: false; error: string };

export type CancelMyBookingResult =
  | { success: true; bookingNumber: string }
  | { success: false; error: { code: string; message: string } };

// ============================================================
// CREATE BOOKING
// ============================================================

export async function createBookingAction(input: unknown): Promise<CreateBookingResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      fieldErrors[path] = fieldErrors[path] ?? [];
      fieldErrors[path].push(issue.message);
    }
    return {
      success: false,
      error: { code: 'validation', message: 'Dados invalidos. Verifica os campos.', fieldErrors },
    };
  }

  const data: CreateBookingInput = parsed.data;

  const rateLimit = checkRateLimit(data.guestInfo.email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: 'rate-limit',
        message: `Demasiadas reservas. Tente novamente em ${Math.ceil((rateLimit.retryAfter ?? 60) / 60)} minutos.`,
      },
    };
  }

  await connectDB();

  const dateObj = parseDateString(data.date);
  const availability = await getAvailableSlots({
    date: dateObj,
    serviceIds: data.serviceIds,
    staffId: data.staffId,
  });

  if (availability.error) {
    return { success: false, error: { code: 'validation', message: availability.error.message } };
  }

  const requestedSlot = availability.slots.find((s) => s.time === data.time);
  if (!requestedSlot) {
    return {
      success: false,
      error: {
        code: 'slot-taken',
        message: 'Este horario ja nao esta disponivel. Por favor escolha outro.',
      },
    };
  }

  if (data.staffId !== 'any' && requestedSlot.staffId !== data.staffId) {
    return {
      success: false,
      error: {
        code: 'slot-taken',
        message: 'O profissional escolhido ja nao esta disponivel neste horario.',
      },
    };
  }

  const { Service } = await import('@/lib/models');
  const services = await Service.find({ _id: { $in: data.serviceIds }, active: true }).lean();

  if (services.length === 0) {
    return { success: false, error: { code: 'no-services', message: 'Servicos nao encontrados' } };
  }

  const startTime = combineDateAndTime(dateObj, data.time);
  const totalDuration = availability.metadata.totalDurationMinutes;
  const endTime = combineDateAndTime(
    dateObj,
    minutesToTime(timeToMinutes(data.time) + totalDuration),
  );

  const serviceItems = data.serviceIds.map((sid) => {
    const s = services.find((srv) => String(srv._id) === sid)!;
    return { serviceId: s._id, name: s.name.pt, price: s.price, duration: s.duration };
  });

  const totalPrice = serviceItems.reduce((sum, item) => sum + item.price, 0);

  let clientDoc = await Client.findOne({
    $or: [{ email: data.guestInfo.email }, { phone: data.guestInfo.phone }],
    active: true,
  });

  if (!clientDoc) {
    clientDoc = await Client.create({
      name: data.guestInfo.name,
      email: data.guestInfo.email,
      phone: data.guestInfo.phone,
      source: 'online',
      marketingConsent: data.marketingConsent ?? false,
      ...(data.requestInvoice && data.fiscalData ? { fiscalData: data.fiscalData } : {}),
    });
  } else {
    let needsSave = false;
    if (data.guestInfo.name !== clientDoc.name) {
      clientDoc.name = data.guestInfo.name;
      needsSave = true;
    }
    if (data.requestInvoice && data.fiscalData) {
      clientDoc.fiscalData = {
        ...(clientDoc.fiscalData ?? { country: 'PT' }),
        ...data.fiscalData,
      };
      needsSave = true;
    }
    if (data.marketingConsent && !clientDoc.marketingConsent) {
      clientDoc.marketingConsent = true;
      needsSave = true;
    }
    if (needsSave) await clientDoc.save();
  }

  const cancellationToken = randomBytes(24).toString('base64url');
  const bookingNumber = await generateBookingNumber();

  try {
    const conflictCheck = await Booking.findOne({
      staffId: requestedSlot.staffId,
      status: { $in: ['pending', 'confirmed', 'in-progress'] },
      $or: [
        { startTime: { $gte: startTime, $lt: endTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
      ],
    }).lean();

    if (conflictCheck) {
      return {
        success: false,
        error: {
          code: 'slot-taken',
          message: 'Este horario foi reservado por outro cliente. Por favor escolha outro.',
        },
      };
    }

    const booking = await Booking.create({
      bookingNumber,
      clientId: clientDoc._id,
      staffId: requestedSlot.staffId,
      services: serviceItems,
      totalDuration,
      totalPrice,
      startTime,
      endTime,
      status: 'pending',
      source: data.source,
      notes: data.notes,
      remindersSent: { confirmation: false, dayBefore: false, hourBefore: false },
      internalNotes: `cancellationToken=${cancellationToken}`,
    });

    await logAudit({
      action: 'create',
      resource: 'booking',
      resourceId: String(booking._id),
      resourceLabel: bookingNumber,
      userName: data.guestInfo.name,
      userEmail: data.guestInfo.email,
      userRole: 'guest',
      message: `Booking criado: ${serviceItems.map((s) => s.name).join(', ')} com ${requestedSlot.staffName}`,
      severity: 'info',
      metadata: { bookingNumber, totalPrice, totalDuration, source: data.source },
    });

    console.log('\n📧 [MOCK EMAIL] Booking confirmation');
    console.log(`   To: ${data.guestInfo.email}`);
    console.log(`   Booking: ${bookingNumber}`);
    console.log(`   Date: ${data.date} ${data.time}`);
    console.log(`   Staff: ${requestedSlot.staffName}`);
    console.log(`   Services: ${serviceItems.map((s) => s.name).join(', ')}`);
    console.log(`   Total: €${(totalPrice / 100).toFixed(2)}`);
    console.log(`   Cancellation link: /cancelar/${cancellationToken}\n`);

    return {
      success: true,
      booking: {
        bookingNumber,
        startTime,
        endTime,
        totalDuration,
        totalPrice,
        staffName: requestedSlot.staffName,
        cancellationToken,
      },
    };
  } catch (err) {
    console.error('[createBookingAction] Falha:', err);
    return {
      success: false,
      error: { code: 'internal', message: 'Erro ao criar reserva. Por favor tente novamente.' },
    };
  }
}

// ============================================================
// CANCEL BOOKING (via token de email)
// ============================================================

export async function cancelBookingAction(input: unknown): Promise<CancelBookingResult> {
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: 'invalid-token', message: 'Dados invalidos' } };
  }

  const { bookingNumber, cancellationToken, reason } = parsed.data as CancelBookingInput;

  await connectDB();

  const booking = await Booking.findOne({ bookingNumber });
  if (!booking) {
    return { success: false, error: { code: 'not-found', message: 'Reserva nao encontrada' } };
  }

  const tokenMatch = booking.internalNotes?.match(/cancellationToken=(\S+)/);
  if (!tokenMatch || tokenMatch[1] !== cancellationToken) {
    return { success: false, error: { code: 'invalid-token', message: 'Token invalido' } };
  }

  if (booking.status === 'cancelled') {
    return {
      success: false,
      error: { code: 'already-cancelled', message: 'Reserva ja foi cancelada' },
    };
  }

  if (booking.status === 'completed') {
    return {
      success: false,
      error: { code: 'already-cancelled', message: 'Reserva ja foi concluida' },
    };
  }

  const hoursUntil = (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    return {
      success: false,
      error: {
        code: 'too-late',
        message:
          'Cancelamentos so podem ser feitos com pelo menos 24h de antecedencia. Por favor contacte o salao.',
      },
    };
  }

  booking.status = 'cancelled';
  booking.cancellationReason = reason ?? 'Cancelado pelo cliente';
  booking.cancelledBy = 'client';
  booking.cancelledAt = new Date();
  await booking.save();

  await logAudit({
    action: 'cancel',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: bookingNumber,
    userRole: 'guest',
    message: `Booking ${bookingNumber} cancelado pelo cliente`,
    severity: 'info',
    metadata: { reason: booking.cancellationReason },
  });

  console.log(`\n📧 [MOCK EMAIL] Booking cancelled: ${bookingNumber}\n`);

  return { success: true, bookingNumber };
}

// ============================================================
// GET AVAILABLE SLOTS (wrapper)
// ============================================================

export async function getAvailableSlotsAction(input: {
  date: string;
  serviceIds: string[];
  staffId: string;
}) {
  const dateObj = parseDateString(input.date);
  return getAvailableSlots({ date: dateObj, serviceIds: input.serviceIds, staffId: input.staffId });
}

// ============================================================
// CLIENT AREA — Server Actions
// ============================================================

export async function getMyBookingsAction(): Promise<GetMyBookingsResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'client' || !session.user.clientId) {
    return { success: false, error: 'Não autenticado' };
  }

  await connectDB();

  try {
    const bookings = await Booking.find({ clientId: session.user.clientId })
      .sort({ startTime: -1 })
      .populate('staffId', 'name slug photo')
      .lean();

    const now = new Date();

    const formatted: BookingForClient[] = bookings.map((b) => ({
      bookingNumber: b.bookingNumber,
      startTime: b.startTime,
      endTime: b.endTime,
      totalDuration: b.totalDuration,
      totalPrice: b.totalPrice,
      status: b.status,
      services: b.services.map((s) => ({ name: s.name, price: s.price, duration: s.duration })),
      staff: b.staffId
        ? {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (b.staffId as any).name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            photo: (b.staffId as any).photo,
          }
        : null,
      isFuture: b.startTime > now,
      isCancellable:
        b.status === 'pending' || b.status === 'confirmed'
          ? (b.startTime.getTime() - now.getTime()) / (1000 * 60 * 60) >= 24
          : false,
      hoursUntil:
        b.startTime > now
          ? Math.round((b.startTime.getTime() - now.getTime()) / (1000 * 60 * 60))
          : 0,
    }));

    return { success: true, bookings: formatted };
  } catch (err) {
    console.error('[getMyBookingsAction] failed:', err);
    return { success: false, error: 'Erro ao buscar reservas' };
  }
}

export async function cancelMyBookingAction(input: {
  bookingNumber: string;
  reason?: string;
}): Promise<CancelMyBookingResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'client' || !session.user.clientId) {
    return { success: false, error: { code: 'unauthorized', message: 'Não autenticado' } };
  }

  await connectDB();

  const booking = await Booking.findOne({
    bookingNumber: input.bookingNumber,
    clientId: session.user.clientId,
  });

  if (!booking) {
    return { success: false, error: { code: 'not-found', message: 'Reserva não encontrada' } };
  }

  if (booking.status === 'cancelled') {
    return {
      success: false,
      error: { code: 'already-cancelled', message: 'Reserva já cancelada' },
    };
  }

  if (booking.status === 'completed') {
    return {
      success: false,
      error: { code: 'already-completed', message: 'Reserva já concluída' },
    };
  }

  const hoursUntil = (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    return {
      success: false,
      error: {
        code: 'too-late',
        message:
          'Cancelamentos só podem ser feitos com pelo menos 24h de antecedência. Por favor contacta o salão pelo telefone +351 932 932 691.',
      },
    };
  }

  booking.status = 'cancelled';
  booking.cancellationReason = input.reason ?? 'Cancelado pelo cliente na área de cliente';
  booking.cancelledBy = 'client';
  booking.cancelledAt = new Date();
  await booking.save();

  await logAudit({
    action: 'cancel',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: input.bookingNumber,
    userId: new mongoose.Types.ObjectId(session.user.id),
    userName: session.user.name,
    userEmail: session.user.email,
    userRole: 'client',
    message: `Cliente cancelou reserva ${input.bookingNumber} pela área de cliente`,
    severity: 'info',
    metadata: { reason: booking.cancellationReason },
  });

  console.log(`\n📧 [MOCK EMAIL] Cancellation by client: ${input.bookingNumber}\n`);

  return { success: true, bookingNumber: input.bookingNumber };
}

// ============================================================
// SPRINT 5 STUBS (placeholders documentados)
// ============================================================
// export async function createManualBookingAction(input) { ... }
// export async function adminCancelBookingAction(input) { ... }
// export async function updateBookingStatusAction(input) { ... }

// ============================================================
// HELPERS
// ============================================================

function parseDateString(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}
