// 📄 src/lib/server-actions/bookings.ts
'use server';

/**
 * Chi Sublime — Server Actions: marcação online (cliente)
 * ============================================================
 *
 * CHANGELOG (revisão do sistema de marcação):
 *  - SEGURANÇA: createBookingAction exige sessão de cliente. O fluxo
 *    /reservar/confirmar só funciona com login, mas a action podia ser
 *    chamada diretamente com qualquer nome/email/telefone.
 *  - DADOS: a reserva liga-se ao Client da SESSÃO. Antes procurava
 *    por email OU telefone e renomeava o registo encontrado — uma mãe
 *    a marcar para a filha com o mesmo telefone ficava com a reserva
 *    (e o nome) trocados.
 *  - AGENDA: a verificação final de conflito considera o buffer das
 *    reservas existentes e qualquer sobreposição, igual ao motor de
 *    disponibilidade (antes ignorava o buffer).
 *  - `source` forçado a 'website' (vinha do browser).
 *  - Cancelamento por token: o email ao cliente usava guestInfo, que
 *    nunca existe em reservas online → nenhum email era enviado.
 *  - Janela de cancelamento lida de BOOKING_RULES.
 *  - getAvailableSlotsAction valida o input (IDs inválidos rebentavam).
 *  - POLÍTICA: confirmação instantânea (lib/booking/policy.ts). A
 *    reserva nasce 'confirmed' e o email de confirmação leva o convite
 *    .ics. Com approvalMode='manual' nasce 'pending' e o cliente recebe
 *    "pedido recebido".
 *  - Cancelamentos pela cliente alertam o salão (horário ficou livre).
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { notifyBookingCreated, notifyBookingCancelled } from '@/lib/email/booking-notifications';
import {
  Booking,
  Client,
  Service,
  SLOT_BLOCKING_STATUSES,
  Staff,
  generateBookingNumber,
  logAudit,
  type IBooking,
} from '@/lib/models';
import { auth } from '@/lib/auth';
import {
  getAvailableSlots,
  validateDate,
  type AvailabilityResult,
} from '@/lib/booking/availability';
import { slotConflictsWithBookings } from '@/lib/booking/conflicts';
import { BOOKING_RULES } from '@/lib/constants/business';
import { getOnlineBookingInitialStatus } from '@/lib/booking/policy';
import { combineDateAndTime, timeToMinutes, minutesToTime } from '@/lib/utils/time-utils';
import { z } from 'zod';
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
        status: 'pending' | 'confirmed';
      };
    }
  | {
      success: false;
      error: {
        code:
          | 'unauthorized'
          | 'validation'
          | 'slot-taken'
          | 'rate-limit'
          | 'no-services'
          | 'no-staff'
          | 'internal';
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
  // A marcação online exige conta de cliente (o Step3 só submete com sessão).
  const session = await auth();
  const sessionClientId = session?.user?.role === 'client' ? session.user.clientId : undefined;
  if (!session?.user || !sessionClientId) {
    return {
      success: false,
      error: { code: 'unauthorized', message: 'Inicia sessão para concluir a marcação.' },
    };
  }

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

  const rateLimit = checkRateLimit(`client:${sessionClientId}`);
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

  // ── Guarda explícita do horizonte de reserva ────────────────
  // O getAvailableSlots abaixo já valida isto, mas é uma função de
  // LEITURA. Garantir uma invariante de ESCRITA através de um efeito
  // secundário de uma leitura é frágil: qualquer caminho novo (API
  // route, webhook, futuro reagendamento) perde a proteção sem que
  // ninguém repare. Esta guarda vive na fronteira de escrita, que é
  // onde pertence — e é barata.
  const dateError = validateDate(dateObj);
  if (dateError) {
    return { success: false, error: { code: 'validation', message: dateError.message } };
  }

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
    return {
      serviceId: s._id,
      name: s.name.pt,
      price: s.price,
      duration: s.duration,
      bufferAfter: s.bufferAfter ?? 0,
    };
  });

  const totalPrice = serviceItems.reduce((sum, item) => sum + item.price, 0);

  // Cliente = o da sessão. Nunca procurar por email/telefone vindos do
  // formulário: não se sobrescrevem dados de outra pessoa.
  const clientDoc = await Client.findOne({ _id: sessionClientId, active: true });
  if (!clientDoc) {
    return {
      success: false,
      error: {
        code: 'unauthorized',
        message: 'Conta de cliente não encontrada. Contacta o salão.',
      },
    };
  }

  let needsSave = false;
  if (data.guestInfo.phone && phoneDigits(data.guestInfo.phone) !== phoneDigits(clientDoc.phone)) {
    // O Step3 pede ao cliente para confirmar o telefone — é o dado mais atual
    clientDoc.phone = data.guestInfo.phone;
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

  const clientName = clientDoc.name;
  const clientEmail = clientDoc.email ?? session.user.email;
  const clientPhone = clientDoc.phone;

  const initialStatus = getOnlineBookingInitialStatus();
  const cancellationToken = randomBytes(24).toString('base64url');
  const bookingNumber = await generateBookingNumber();

  try {
    // Verificação final contra reservas criadas entre o cálculo dos slots e
    // agora. Mesma regra do motor de disponibilidade: sobreposição real,
    // contando o buffer após cada reserva existente. (O índice único só
    // apanha o MESMO startTime; sobreposições parciais passavam.)
    const MAX_BUFFER_MS = 120 * 60_000;
    const nearby = await Booking.find({
      staffId: requestedSlot.staffId,
      status: { $in: SLOT_BLOCKING_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: new Date(startTime.getTime() - MAX_BUFFER_MS) },
    })
      .select('_id startTime endTime bufferAfter')
      .lean();

    const conflictCheck = slotConflictsWithBookings(
      startTime,
      endTime,
      nearby.map((b) => ({
        id: String(b._id),
        startTime: new Date(b.startTime),
        endTime: new Date(b.endTime),
        bufferAfter: b.bufferAfter ?? BOOKING_RULES.defaultBufferMinutes,
      })),
    ).hasConflict;

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
      status: initialStatus,
      source: 'website',
      notes: data.notes,
      remindersSent: { confirmation: false, dayBefore: false, hourBefore: false },
      internalNotes: `cancellationToken=${cancellationToken}`,
    });

    await logAudit({
      action: 'create',
      resource: 'booking',
      resourceId: String(booking._id),
      resourceLabel: bookingNumber,
      userId: new mongoose.Types.ObjectId(session.user.id),
      userName: clientName,
      userEmail: clientEmail,
      userRole: 'client',
      message: `Booking criado: ${serviceItems.map((s) => s.name).join(', ')} com ${requestedSlot.staffName}`,
      severity: 'info',
      metadata: { bookingNumber, totalPrice, totalDuration, source: 'website' },
    });

    // Emails reais (cliente + alerta ao salão). AWAIT obrigatório:
    // em serverless, um fire-and-forget pode ser morto com a lambda
    // antes de o Resend responder. notifyBookingCreated nunca lança.
    await notifyBookingCreated({
      bookingNumber,
      startTime,
      endTime: booking.endTime,
      status: initialStatus,
      services: serviceItems.map((s) => s.name),
      staffName: requestedSlot.staffName,
      totalPrice,
      source: 'website',
      client: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      },
    });

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
        status: initialStatus,
      },
    };
  } catch (err) {
    // E11000 = índice único anti-double-booking disparou: dois pedidos
    // simultâneos apanharam o mesmo slot e este perdeu a corrida.
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error: {
          code: 'slot-taken',
          message: 'Este horario foi reservado por outro cliente. Por favor escolha outro.',
        },
      };
    }
    console.error('[createBookingAction] Falha:', err);
    return {
      success: false,
      error: { code: 'internal', message: 'Erro ao criar reserva. Por favor tente novamente.' },
    };
  }
}

/** Deteta o erro de chave duplicada do MongoDB (código 11000), venha de onde vier. */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
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
  if (!tokenMatch || !safeEqual(tokenMatch[1], cancellationToken)) {
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
  if (hoursUntil < BOOKING_RULES.cancellationWindowHours) {
    return {
      success: false,
      error: {
        code: 'too-late',
        message: `Cancelamentos so podem ser feitos com pelo menos ${BOOKING_RULES.cancellationWindowHours}h de antecedencia. Por favor contacte o salao.`,
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

  // Reservas online têm clientId (não guestInfo) — resolver o contacto no Client
  const [bookingClient, bookingStaff] = await Promise.all([
    booking.clientId ? Client.findById(booking.clientId).select('name email phone').lean() : null,
    Staff.findById(booking.staffId).select('name').lean(),
  ]);

  await notifyBookingCancelled({
    bookingNumber,
    startTime: booking.startTime,
    reason: booking.cancellationReason,
    client: {
      name: bookingClient?.name ?? booking.guestInfo?.name ?? 'Cliente',
      email: bookingClient?.email ?? booking.guestInfo?.email,
      phone: bookingClient?.phone ?? booking.guestInfo?.phone,
    },
    salonAlert: {
      services: booking.services.map((s) => s.name),
      staffName: bookingStaff?.name,
    },
  });

  return { success: true, bookingNumber };
}

// ============================================================
// GET AVAILABLE SLOTS (wrapper)
// ============================================================

const availabilityInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(5),
  staffId: z.union([z.string().regex(/^[0-9a-fA-F]{24}$/), z.literal('any')]),
});

export async function getAvailableSlotsAction(input: {
  date: string;
  serviceIds: string[];
  staffId: string;
}): Promise<AvailabilityResult> {
  const parsed = availabilityInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      date: typeof input?.date === 'string' ? input.date : '',
      slots: [],
      metadata: {
        salonOpen: false,
        totalDurationMinutes: 0,
        candidateStaffIds: [],
        serviceNames: [],
      },
      error: { code: 'invalid-services', message: 'Pedido de disponibilidade inválido' },
    };
  }
  return getAvailableSlots({
    date: parseDateString(parsed.data.date),
    serviceIds: parsed.data.serviceIds,
    staffId: parsed.data.staffId,
  });
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
          ? (b.startTime.getTime() - now.getTime()) / (1000 * 60 * 60) >=
            BOOKING_RULES.cancellationWindowHours
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

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return {
      success: false,
      error: { code: 'already-completed', message: 'Esta reserva já não pode ser cancelada' },
    };
  }

  const hoursUntil = (booking.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < BOOKING_RULES.cancellationWindowHours) {
    return {
      success: false,
      error: {
        code: 'too-late',
        message: `Cancelamentos só podem ser feitos com pelo menos ${BOOKING_RULES.cancellationWindowHours}h de antecedência. Por favor contacta o salão pelo telefone +351 932 932 691.`,
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

  const [bookingClient, bookingStaff] = await Promise.all([
    Client.findById(session.user.clientId).select('name email phone').lean(),
    Staff.findById(booking.staffId).select('name').lean(),
  ]);

  await notifyBookingCancelled({
    bookingNumber: input.bookingNumber,
    startTime: booking.startTime,
    reason: booking.cancellationReason,
    client: {
      name: bookingClient?.name ?? session.user.name,
      email: bookingClient?.email ?? session.user.email,
      phone: bookingClient?.phone,
    },
    salonAlert: {
      services: booking.services.map((s) => s.name),
      staffName: bookingStaff?.name,
    },
  });

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

/** Compara telefones PT ignorando espaços e o prefixo +351/00351. */
function phoneDigits(phone?: string): string {
  return (phone ?? '').replace(/\D/g, '').replace(/^(00)?351(?=\d{9}$)/, '');
}

/** Comparação em tempo constante (evita timing attacks no token). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function parseDateString(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}
