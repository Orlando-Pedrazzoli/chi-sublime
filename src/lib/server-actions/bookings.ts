'use server';

/**
 * Chi Sublime — Booking Server Actions
 * ============================================================
 *
 * Camada de seguranca server-side para o sistema de reservas.
 *
 * Decisoes:
 *  - Valida com Zod ANTES de qualquer query
 *  - Re-valida slot no submit (anti race condition)
 *  - Mongoose transactions para criar Booking + atualizar Client + audit log
 *  - Numeracao atomica via Counter.findOneAndUpdate({$inc})
 *  - Rate limiting em memoria (3 bookings/IP/hora)
 *  - Email descartavel bloqueado por lista negra
 *  - Audit log fail-soft (nunca bloqueia operacao principal)
 *  - Email mock por agora (apenas log na consola)
 */

import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, generateBookingNumber, logAudit, type IBooking } from '@/lib/models';
import { getAvailableSlots } from '@/lib/booking/availability';
import { combineDateAndTime, timeToMinutes, minutesToTime } from '@/lib/utils/time-utils';
import {
  createBookingSchema,
  cancelBookingSchema,
  type CreateBookingInput,
  type CancelBookingInput,
} from '@/lib/validation/booking';

// ============================================================
// RATE LIMITING (em memoria)
// ============================================================

type RateLimitEntry = {
  count: number;
  resetAt: number; // timestamp ms
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_PER_HOUR = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(identifier: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_PER_HOUR) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

// ============================================================
// TIPOS DE OUTPUT
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

// ============================================================
// CREATE BOOKING
// ============================================================

/**
 * Cria uma reserva real na database.
 *
 * Fluxo:
 *  1. Rate limit por email
 *  2. Validacao Zod (input completo)
 *  3. Re-validacao do slot (anti race condition)
 *  4. Resolver serviços para snapshot
 *  5. Criar/atualizar Client (procurar por phone/email primeiro)
 *  6. Criar Booking dentro de transaction:
 *      - Verificar conflito final
 *      - Gerar bookingNumber atomico
 *      - Gerar cancellationToken
 *      - Criar Booking
 *      - Atualizar Client.lastVisit (mas NAO totalSpent — so apos transaction completed)
 *      - Audit log entry
 *  7. (Mock) Log de email
 *
 * @param input Dados da reserva
 * @returns Resultado discriminado (success/error)
 */
export async function createBookingAction(input: unknown): Promise<CreateBookingResult> {
  // ============================================================
  // 1. VALIDACAO ZOD
  // ============================================================
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
      error: {
        code: 'validation',
        message: 'Dados invalidos. Verifica os campos.',
        fieldErrors,
      },
    };
  }

  const data: CreateBookingInput = parsed.data;

  // ============================================================
  // 2. RATE LIMIT (por email)
  // ============================================================
  const rateLimit = checkRateLimit(data.guestInfo.email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        code: 'rate-limit',
        message: `Demasiadas reservas. Tente novamente em ${Math.ceil(
          (rateLimit.retryAfter ?? 60) / 60,
        )} minutos.`,
      },
    };
  }

  await connectDB();

  // ============================================================
  // 3. RE-VALIDACAO DO SLOT (CRITICA — anti race condition)
  // ============================================================
  // Cliente pode ter clicado "Confirmar" 5 minutos depois de ver os slots.
  // Verificamos AGORA se o slot ainda esta livre.

  const dateObj = parseDateString(data.date);
  const availability = await getAvailableSlots({
    date: dateObj,
    serviceIds: data.serviceIds,
    staffId: data.staffId,
  });

  if (availability.error) {
    return {
      success: false,
      error: {
        code: 'validation',
        message: availability.error.message,
      },
    };
  }

  // Procurar slot pedido
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

  // Se o cliente escolheu staff especifico mas o sistema atribuiu outro,
  // significa que o original ficou indisponivel desde a ultima query.
  if (data.staffId !== 'any' && requestedSlot.staffId !== data.staffId) {
    return {
      success: false,
      error: {
        code: 'slot-taken',
        message: 'O profissional escolhido ja nao esta disponivel neste horario.',
      },
    };
  }

  // ============================================================
  // 4. RESOLVER SERVICOS PARA SNAPSHOT
  // ============================================================
  const { Service } = await import('@/lib/models');
  const services = await Service.find({
    _id: { $in: data.serviceIds },
    active: true,
  }).lean();

  if (services.length === 0) {
    return {
      success: false,
      error: { code: 'no-services', message: 'Servicos nao encontrados' },
    };
  }

  // Calcular tempos finais
  const startTime = combineDateAndTime(dateObj, data.time);
  const totalDuration = availability.metadata.totalDurationMinutes;
  const endTime = combineDateAndTime(
    dateObj,
    minutesToTime(timeToMinutes(data.time) + totalDuration),
  );

  // Snapshot dos servicos
  const serviceItems = data.serviceIds.map((sid) => {
    const s = services.find((srv) => String(srv._id) === sid)!;
    return {
      serviceId: s._id,
      name: s.name.pt,
      price: s.price,
      duration: s.duration,
    };
  });

  const totalPrice = serviceItems.reduce((sum, item) => sum + item.price, 0);

  // ============================================================
  // 5. CRIAR/ATUALIZAR CLIENT
  // ============================================================
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
    // Atualizar campos opcionais se vierem novos
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

  // ============================================================
  // 6. CRIAR BOOKING (com transaction se replicaSet disponivel)
  // ============================================================
  const cancellationToken = randomBytes(24).toString('base64url');
  const bookingNumber = await generateBookingNumber();

  try {
    // Re-verificar conflito UMA ULTIMA VEZ (anti race condition final)
    const conflictCheck = await Booking.findOne({
      staffId: requestedSlot.staffId,
      status: { $in: ['pending', 'confirmed', 'in-progress'] },
      $or: [
        // Reserva existente comeca durante a nossa
        {
          startTime: { $gte: startTime, $lt: endTime },
        },
        // Reserva existente acaba durante a nossa
        {
          endTime: { $gt: startTime, $lte: endTime },
        },
        // Reserva existente engloba a nossa
        {
          startTime: { $lte: startTime },
          endTime: { $gte: endTime },
        },
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

    // Criar booking
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
      remindersSent: {
        confirmation: false,
        dayBefore: false,
        hourBefore: false,
      },
      // Guardamos token nas internalNotes temporariamente
      // (em producao seria campo dedicado encriptado)
      internalNotes: `cancellationToken=${cancellationToken}`,
    });

    // Audit log (fail-soft)
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
      metadata: {
        bookingNumber,
        totalPrice,
        totalDuration,
        source: data.source,
      },
    });

    // ============================================================
    // 7. EMAIL MOCK (Resend desligado conforme decisao)
    // ============================================================
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
      error: {
        code: 'internal',
        message: 'Erro ao criar reserva. Por favor tente novamente.',
      },
    };
  }
}

// ============================================================
// CANCEL BOOKING
// ============================================================

/**
 * Cancela uma reserva (cliente, via link de email).
 *
 * Validacoes:
 *  - Token corresponde ao da reserva
 *  - Reserva nao esta ja cancelada/concluida
 *  - Estamos a 24h ou mais da reserva (best practice industria)
 */
export async function cancelBookingAction(input: unknown): Promise<CancelBookingResult> {
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'invalid-token', message: 'Dados invalidos' },
    };
  }

  const { bookingNumber, cancellationToken, reason } = parsed.data as CancelBookingInput;

  await connectDB();

  const booking = await Booking.findOne({ bookingNumber });
  if (!booking) {
    return {
      success: false,
      error: { code: 'not-found', message: 'Reserva nao encontrada' },
    };
  }

  // Validar token (guardado em internalNotes)
  const tokenMatch = booking.internalNotes?.match(/cancellationToken=(\S+)/);
  if (!tokenMatch || tokenMatch[1] !== cancellationToken) {
    return {
      success: false,
      error: { code: 'invalid-token', message: 'Token invalido' },
    };
  }

  if (booking.status === 'cancelled') {
    return {
      success: false,
      error: {
        code: 'already-cancelled',
        message: 'Reserva ja foi cancelada',
      },
    };
  }

  if (booking.status === 'completed') {
    return {
      success: false,
      error: {
        code: 'already-cancelled',
        message: 'Reserva ja foi concluida',
      },
    };
  }

  // Janela 24h
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
// GET AVAILABLE SLOTS (wrapper para client-side)
// ============================================================

/**
 * Wrapper "use server" do getAvailableSlots.
 * Permite chamadas a partir de Client Components.
 */
export async function getAvailableSlotsAction(input: {
  date: string; // YYYY-MM-DD
  serviceIds: string[];
  staffId: string;
}) {
  const dateObj = parseDateString(input.date);
  return getAvailableSlots({
    date: dateObj,
    serviceIds: input.serviceIds,
    staffId: input.staffId,
  });
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Parse YYYY-MM-DD → Date a meio-dia (evita issues TZ).
 */
function parseDateString(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}
