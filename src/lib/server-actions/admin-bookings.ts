// 📄 src/lib/server-actions/admin-bookings.ts
'use server';

/**
 * Chi Sublime — Server Actions: agenda do admin
 * ============================================================
 *
 * REVISÃO (nov. 2026):
 *  - NOVO rescheduleBookingAction + getRescheduleSlotsAction: o salão
 *    passa a poder REMARCAR (dia, hora, profissional). Antes só dava
 *    para cancelar e criar de novo — a cliente recebia um email de
 *    cancelamento e a marcação perdia o número e o histórico.
 *  - getBookingsByDayAction devolve também `dayInfo` (horário do salão
 *    e janela de trabalho de cada profissional nesse dia) — a vista de
 *    dia sombreia folgas, férias, pausas e horas fora do expediente.
 *  - Removida a createManualBookingAction antiga deste ficheiro: nenhum
 *    ecrã a usava (o modal usa a de manual-bookings.ts) mas continuava
 *    a ser um endpoint, sem validação Zod, sem verificar competências
 *    nem datas passadas.
 *  - getAdminBookingMetaAction exige sessão de admin (era pública).
 */

import mongoose from 'mongoose';
import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { connectDB } from '@/lib/db/connect';
import { notifyAdminStatusChange } from '@/lib/booking/status-notifications';
import { notifyBookingRescheduled } from '@/lib/email/booking-notifications';
import { Booking, Category, Client, Service, Staff, logAudit, type IBooking } from '@/lib/models';
import { auth } from '@/lib/auth';
import { combineDateAndTime, getWeekDay } from '@/lib/utils/time-utils';
import {
  canStaffPerformAllServices,
  getAvailableSlots,
  isStaffOnVacation,
  validateDate,
} from '@/lib/booking/availability';
import { resolveSchedule } from '@/lib/booking/schedule-resolver';
import { findOverlappingBooking, lostWriteRace } from '@/lib/booking/overlap';
import { BOOKING_RULES, SALON_TIMEZONE } from '@/lib/constants/business';
import { addDaysISO, isISODay, startOfWeekISO } from '@/lib/utils/salon-day';
import { canTransition, BOOKING_STATUS_VISUAL } from '@/lib/constants/booking-status';
import { resolveRange } from '@/lib/utils/dates';

/** Dias à frente de hoje que o board da dashboard carrega para consulta */
const BOARD_WINDOW_DAYS = 6;

// ============================================================
// TIPOS
// ============================================================

export type AdminBookingForList = {
  id: string;
  bookingNumber: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalPrice: number;
  status: IBooking['status'];
  source: IBooking['source'];
  notes?: string;
  client: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  staff: {
    id: string;
    name: string;
    photo?: string;
  } | null;
  services: Array<{ serviceId: string; name: string; price: number; duration: number }>;
  /** Preenchido quando a marcação já foi cobrada (venda ligada). */
  transactionId?: string;
  /** Hora real de início do atendimento (status → in-progress). */
  startedAt?: Date;
};

export type BoardStaff = {
  id: string;
  name: string;
  photo?: string;
  /** Dias (YYYY-MM-DD, dentro de `days`) em que não trabalha: folga ou férias */
  offDays: Record<string, 'off' | 'vacation'>;
};

export type TodayBoardResult =
  | {
      success: true;
      /** Hoje em Lisboa (YYYY-MM-DD) */
      date: string;
      /** Janela do board: hoje + 6 dias seguintes (YYYY-MM-DD, em Lisboa) */
      days: string[];
      /** Marcações de HOJE (posto de trabalho — com ações) */
      bookings: AdminBookingForList[];
      /** Marcações dos dias seguintes da janela (só consulta) */
      upcoming: AdminBookingForList[];
      staff: BoardStaff[];
    }
  | { success: false; error: string };

/** Intervalo "HH:MM"–"HH:MM" (pausa) */
export type AgendaBreak = { start: string; end: string };

/**
 * Como o salão e cada profissional trabalham NUM dia concreto — já com
 * exceções, feriados, folgas e férias resolvidos. Alimenta o sombreado
 * da vista de dia (o que está a cinzento não é marcável online).
 */
export type AgendaDayInfo = {
  salon: {
    open: boolean;
    start?: string;
    end?: string;
    /** Motivo legível quando fechado ("Feriado", "Encerrado neste dia…") */
    closedDetail?: string;
  };
  /** Por id de profissional ativo */
  staff: Record<
    string,
    {
      working: boolean;
      /** Porque não trabalha: folga semanal ou férias */
      reason?: 'off' | 'vacation';
      /** Janela efetiva = horário do salão ∩ horário do profissional */
      start?: string;
      end?: string;
      /** Pausas do salão + pausas do profissional */
      breaks: AgendaBreak[];
    }
  >;
};

export type DayBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; date: string; dayInfo: AgendaDayInfo }
  | { success: false; error: string };

export type WeekBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; weekStart: string; weekEnd: string }
  | { success: false; error: string };

export type SimpleResult = { success: true } | { success: false; error: string };

export type SearchClientsResult = {
  success: true;
  clients: Array<{ id: string; name: string; phone: string; email?: string }>;
};

export type AdminBookingMeta = {
  staff: Array<{ id: string; name: string; photo?: string }>;
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
    /** Buffer de limpeza após o serviço (min) — entra na duração total */
    bufferAfter: number;
    /** Profissionais que fazem o serviço (vazio = qualquer um) */
    staffIds: string[];
    categorySlug?: string;
  }>;
  /** Categorias ativas, na ordem do admin — as tabs do modal são dinâmicas */
  categories: Array<{ slug: string; name: string; color: string; order: number }>;
};

export type RescheduleSlotsResult =
  | { success: true; times: string[]; closedDetail?: string }
  | { success: false; error: string };

// ============================================================
// HELPERS
// ============================================================

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/**
 * Instante (UTC) em que o dia YYYY-MM-DD começa EM LISBOA.
 *
 * FIX (out. 2026): as janelas de dia/semana eram calculadas com
 * setHours(0,0,0,0), que usa o fuso do SERVIDOR (UTC na Vercel). No
 * horário de verão a janela ficava 1h deslocada face ao dia do salão.
 * Agora os limites são sempre a meia-noite de Lisboa, e o fim é
 * exclusivo ($lt do dia seguinte) — sem buracos nem sobreposições.
 */
function salonDayStart(isoDay: string): Date {
  return fromZonedTime(`${isoDay}T00:00:00`, SALON_TIMEZONE);
}

/** Mesma regra do motor (availability.ts): janela = salão ∩ profissional. */
async function buildDayInfo(isoDay: string): Promise<AgendaDayInfo> {
  const noon = parseDate(isoDay);
  const [schedule, staff] = await Promise.all([
    resolveSchedule(noon),
    Staff.find({ active: true }).select('workingHours vacations').lean(),
  ]);

  const weekday = getWeekDay(noon);
  const info: AgendaDayInfo = {
    salon: schedule.open
      ? { open: true, start: schedule.start, end: schedule.end }
      : { open: false, closedDetail: schedule.reasonDetail },
    staff: {},
  };

  for (const s of staff) {
    const id = String(s._id);
    const config = s.workingHours?.[weekday];

    if (isStaffOnVacation(s, noon)) {
      info.staff[id] = { working: false, reason: 'vacation', breaks: [] };
      continue;
    }
    if (!config?.enabled) {
      info.staff[id] = { working: false, reason: 'off', breaks: [] };
      continue;
    }
    if (!schedule.open || !schedule.start || !schedule.end) {
      // Salão fechado: a coluna inteira fica sombreada pelo `salon.open`
      info.staff[id] = { working: true, breaks: [] };
      continue;
    }

    const start = config.start > schedule.start ? config.start : schedule.start;
    const end = config.end < schedule.end ? config.end : schedule.end;
    info.staff[id] = {
      working: true,
      start,
      end,
      breaks: [...(schedule.breaks ?? []), ...(config.breaks ?? [])].map((b) => ({
        start: b.start,
        end: b.end,
      })),
    };
  }

  return info;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatBooking(doc: any): AdminBookingForList {
  const client = doc.clientId;
  const staff = doc.staffId;
  return {
    id: String(doc._id),
    bookingNumber: doc.bookingNumber,
    startTime: doc.startTime,
    endTime: doc.endTime,
    totalDuration: doc.totalDuration,
    totalPrice: doc.totalPrice,
    status: doc.status,
    source: doc.source,
    notes: doc.notes,
    client: client
      ? {
          id: String(client._id),
          name: client.name,
          phone: client.phone,
          email: client.email,
        }
      : doc.guestInfo
        ? {
            id: '',
            name: doc.guestInfo.name,
            phone: doc.guestInfo.phone,
            email: doc.guestInfo.email,
          }
        : { id: '', name: 'Cliente removido', phone: '' },
    staff: staff
      ? {
          id: String(staff._id),
          name: staff.name,
          photo: staff.photo,
        }
      : null,
    services: (doc.services ?? []).map((s: any) => ({
      serviceId: s.serviceId ? String(s.serviceId) : '',
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
    transactionId: doc.transactionId ? String(doc.transactionId) : undefined,
    startedAt: doc.startedAt ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// GET TODAY BOARD (dashboard — posto de trabalho do balcão)
// ============================================================

/**
 * Marcações de HOJE (em Europe/Lisbon) para o board de atendimento da
 * dashboard, mais a lista de profissionais ativas (uma coluna cada).
 * Exclui canceladas — não são trabalho para ninguém no balcão.
 */
export async function getTodayBoardAction(): Promise<TodayBoardResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  try {
    const today = resolveRange('today');
    // Janela: hoje + 6 dias (uma query só; o board divide por dia no cliente)
    const windowEnd = new Date(today.to.getTime() + BOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [bookings, staff] = await Promise.all([
      Booking.find({
        startTime: { $gte: today.from, $lte: windowEnd },
        status: { $ne: 'cancelled' },
      })
        .sort({ startTime: 1 })
        .populate('clientId', 'name phone email')
        .populate('staffId', 'name photo')
        .lean(),
      Staff.find({ active: true }).sort({ order: 1 }).lean(),
    ]);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // YYYY-MM-DD em hora de Lisboa (toISOString daria o dia anterior
    // no verão: meia-noite em Lisboa = 23:00 UTC)
    const lisbonDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const date = lisbonDay.format(new Date());

    const days: string[] = [];
    for (let i = 0; i <= BOARD_WINDOW_DAYS; i++) {
      days.push(
        lisbonDay.format(
          new Date(today.from.getTime() + i * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        ),
      );
    }

    const todayBookings: AdminBookingForList[] = [];
    const upcoming: AdminBookingForList[] = [];
    for (const doc of bookings) {
      const formatted = formatBooking(doc);
      if (lisbonDay.format(new Date(formatted.startTime)) === date) todayBookings.push(formatted);
      else upcoming.push(formatted);
    }

    return {
      success: true,
      date,
      days,
      bookings: todayBookings,
      upcoming,
      staff: staff.map((s: any) => {
        const offDays: Record<string, 'off' | 'vacation'> = {};
        for (const iso of days) {
          const noon = new Date(`${iso}T12:00:00`);
          if (isStaffOnVacation(s, noon)) offDays[iso] = 'vacation';
          else if (!s.workingHours?.[getWeekDay(noon)]?.enabled) offDays[iso] = 'off';
        }
        return { id: String(s._id), name: s.name, photo: s.photo, offDays };
      }),
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch (err) {
    console.error('[getTodayBoardAction]', err);
    return { success: false, error: 'Erro ao carregar o board de hoje' };
  }
}

// ============================================================
// GET BY DAY
// ============================================================

export async function getBookingsByDayAction(dateStr: string): Promise<DayBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  if (!isISODay(dateStr)) return { success: false, error: 'Data inválida' };

  try {
    const [bookings, dayInfo] = await Promise.all([
      Booking.find({
        startTime: { $gte: salonDayStart(dateStr), $lt: salonDayStart(addDaysISO(dateStr, 1)) },
      })
        .sort({ startTime: 1 })
        .populate('clientId', 'name phone email')
        .populate('staffId', 'name photo')
        .lean(),
      buildDayInfo(dateStr),
    ]);

    return {
      success: true,
      bookings: bookings.map(formatBooking),
      date: dateStr,
      dayInfo,
    };
  } catch (err) {
    console.error('[getBookingsByDayAction]', err);
    return { success: false, error: 'Erro ao buscar marcações' };
  }
}

// ============================================================
// GET BY WEEK
// ============================================================

export async function getBookingsByWeekAction(dateStr: string): Promise<WeekBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  if (!isISODay(dateStr)) return { success: false, error: 'Data inválida' };

  try {
    // Segunda → Domingo da semana do dia pedido, em dias de Lisboa
    const weekStart = startOfWeekISO(dateStr);

    const bookings = await Booking.find({
      startTime: { $gte: salonDayStart(weekStart), $lt: salonDayStart(addDaysISO(weekStart, 7)) },
    })
      .sort({ startTime: 1 })
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name photo')
      .lean();

    return {
      success: true,
      bookings: bookings.map(formatBooking),
      weekStart,
      weekEnd: addDaysISO(weekStart, 6),
    };
  } catch (err) {
    console.error('[getBookingsByWeekAction]', err);
    return { success: false, error: 'Erro ao buscar marcações' };
  }
}

// ============================================================
// GET UPCOMING (lista "Próximas")
// ============================================================

export type UpcomingBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; from: string; to: string }
  | { success: false; error: string };

/**
 * Marcações ativas (pending/confirmed/in-progress) desde o início do
 * dia indicado até `days` dias à frente. Alimenta a vista "Próximas"
 * da agenda e o hint de dia vazio.
 */
export async function getUpcomingBookingsAction(
  fromDateStr: string,
  days = BOOKING_RULES.upcomingViewDays,
): Promise<UpcomingBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  if (!isISODay(fromDateStr)) return { success: false, error: 'Data inválida' };

  try {
    const span = Math.min(Math.max(Math.trunc(days) || 1, 1), BOOKING_RULES.upcomingViewDays);
    const toDay = addDaysISO(fromDateStr, span);

    const bookings = await Booking.find({
      startTime: { $gte: salonDayStart(fromDateStr), $lt: salonDayStart(toDay) },
      status: { $in: ['pending', 'confirmed', 'in-progress'] },
    })
      .sort({ startTime: 1 })
      .limit(200)
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name photo')
      .lean();

    return {
      success: true,
      bookings: bookings.map(formatBooking),
      from: fromDateStr,
      to: toDay,
    };
  } catch (err) {
    console.error('[getUpcomingBookingsAction]', err);
    return { success: false, error: 'Erro ao buscar próximas marcações' };
  }
}

// ============================================================
// UPDATE STATUS
// ============================================================

export type UpdateStatusInput = {
  bookingNumber: string;
  newStatus: IBooking['status'];
  reason?: string;
};

export async function updateBookingStatusAction(input: UpdateStatusInput): Promise<SimpleResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  const booking = await Booking.findOne({ bookingNumber: input.bookingNumber });
  if (!booking) return { success: false, error: 'Marcação não encontrada' };

  const oldStatus = booking.status;

  // Máquina de estados no servidor: com várias profissionais no mesmo
  // ecrã, dois cliques cruzados não podem fazer completed → in-progress.
  if (oldStatus === input.newStatus) return { success: true };
  if (!canTransition(oldStatus, input.newStatus)) {
    return {
      success: false,
      error: `A marcação já está "${BOOKING_STATUS_VISUAL[oldStatus].label}" — atualize o ecrã.`,
    };
  }

  booking.status = input.newStatus;

  if (input.newStatus === 'cancelled') {
    booking.cancellationReason = input.reason ?? 'Cancelado pelo admin';
    booking.cancelledBy = 'staff';
    booking.cancelledAt = new Date();
  }

  await booking.save();

  await logAudit({
    action: input.newStatus === 'cancelled' ? 'cancel' : 'update',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: input.bookingNumber,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Booking ${input.bookingNumber}: ${oldStatus} → ${input.newStatus}`,
    severity: input.newStatus === 'cancelled' ? 'warning' : 'info',
    metadata: { oldStatus, newStatus: input.newStatus, reason: input.reason },
  });

  // Emails ao cliente: pedido confirmado, pedido recusado ou marcação
  // cancelada pelo salão (ver lib/booking/status-notifications.ts).
  await notifyAdminStatusChange(booking, oldStatus);

  return { success: true };
}

// ============================================================
// REMARCAR (dia / hora / profissional)
// ============================================================

const objectIdRe = /^[a-f0-9]{24}$/i;

const rescheduleSlotsSchema = z.object({
  bookingNumber: z.string().trim().min(1).max(30),
  date: z.string().refine(isISODay, 'Data inválida'),
  staffId: z.string().regex(objectIdRe, 'Profissional inválido'),
});

const rescheduleSchema = rescheduleSlotsSchema.extend({
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM)'),
  /** true = encaixe fora do horário/grelha. Nunca salta sobreposições. */
  force: z.boolean().default(false),
});

export type RescheduleBookingInput = z.input<typeof rescheduleSchema>;

/** Só marcações que ainda não começaram podem mudar de hora. */
const RESCHEDULABLE: IBooking['status'][] = ['pending', 'confirmed'];

function bookingServiceIds(booking: Pick<IBooking, 'services'>): string[] {
  return booking.services.map((s) => String(s.serviceId));
}

/**
 * Horários livres para remarcar uma marcação num dado dia/profissional.
 * Usa o motor de disponibilidade real, ignorando a própria marcação.
 */
export async function getRescheduleSlotsAction(input: {
  bookingNumber: string;
  date: string;
  staffId: string;
}): Promise<RescheduleSlotsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  const parsed = rescheduleSlotsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Pedido inválido' };

  await connectDB();

  const booking = await Booking.findOne({ bookingNumber: parsed.data.bookingNumber })
    .select('_id services status')
    .lean();
  if (!booking) return { success: false, error: 'Marcação não encontrada' };

  try {
    const availability = await getAvailableSlots({
      date: parseDate(parsed.data.date),
      serviceIds: bookingServiceIds(booking),
      staffId: parsed.data.staffId,
      excludeBookingId: String(booking._id),
    });

    if (availability.error && availability.error.code !== 'no-qualified-staff') {
      return { success: false, error: availability.error.message };
    }

    return {
      success: true,
      times: availability.slots
        .filter((slot) => slot.staffId === parsed.data.staffId)
        .map((slot) => slot.time),
      closedDetail: availability.metadata.salonOpen
        ? undefined
        : (availability.metadata.closedReasonDetail ?? 'Salão encerrado neste dia'),
    };
  } catch (err) {
    console.error('[getRescheduleSlotsAction]', err);
    return { success: false, error: 'Erro ao calcular os horários livres' };
  }
}

/**
 * Muda o dia, a hora e/ou o profissional de uma marcação, mantendo o
 * número, o cliente, os serviços e o histórico.
 *
 *  - Só 'pending' e 'confirmed' (o que já começou não se remarca).
 *  - A competência do profissional é SEMPRE verificada.
 *  - force=false: o horário tem de existir na grelha real (como no site).
 *  - force=true: salta horário do salão/profissional e a grelha de 30 min,
 *    mas a sobreposição com outras marcações é SEMPRE verificada.
 *  - O lembrete da véspera volta a ficar por enviar (a data mudou).
 *  - A cliente recebe um email com a nova data + convite .ics (o UID do
 *    convite é o número da marcação — o calendário dela atualiza o evento).
 */
export async function rescheduleBookingAction(
  input: RescheduleBookingInput,
): Promise<SimpleResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const data = parsed.data;

  await connectDB();

  const booking = await Booking.findOne({ bookingNumber: data.bookingNumber });
  if (!booking) return { success: false, error: 'Marcação não encontrada' };

  if (!RESCHEDULABLE.includes(booking.status)) {
    return {
      success: false,
      error: `Uma marcação "${BOOKING_STATUS_VISUAL[booking.status].label}" já não pode ser remarcada.`,
    };
  }

  const dateObj = parseDate(data.date);
  const dateError = validateDate(dateObj);
  if (dateError?.code === 'no-past') return { success: false, error: dateError.message };

  // ── Profissional: ativo e competente para TODOS os serviços ──
  const staff = await Staff.findOne({ _id: data.staffId, active: true }).lean();
  if (!staff) return { success: false, error: 'Profissional não encontrado ou inativo' };

  const serviceIds = bookingServiceIds(booking);
  const services = await Service.find({ _id: { $in: serviceIds } }).lean();
  if (!canStaffPerformAllServices(staff, services)) {
    return {
      success: false,
      error: `${staff.name} não realiza todos os serviços desta marcação. Escolhe outro profissional.`,
    };
  }

  const newStart = combineDateAndTime(dateObj, data.time);
  const newEnd = new Date(newStart.getTime() + booking.totalDuration * 60_000);

  const oldStart = booking.startTime;
  const oldStaffId = booking.staffId;
  const staffChanged = String(oldStaffId) !== data.staffId;

  if (!staffChanged && oldStart.getTime() === newStart.getTime()) {
    return { success: false, error: 'A marcação já está nesse dia, hora e profissional.' };
  }

  // ── Horário (saltável com force) ──
  if (!data.force) {
    const availability = await getAvailableSlots({
      date: dateObj,
      serviceIds,
      staffId: data.staffId,
      excludeBookingId: String(booking._id),
    });

    if (availability.error) return { success: false, error: availability.error.message };
    if (!availability.metadata.salonOpen) {
      return {
        success: false,
        error: availability.metadata.closedReasonDetail ?? 'Salão encerrado nesta data',
      };
    }
    const slotExists = availability.slots.some(
      (slot) => slot.time === data.time && slot.staffId === data.staffId,
    );
    if (!slotExists) {
      return {
        success: false,
        error:
          `${staff.name} não tem este horário livre neste dia. ` +
          'Escolhe um dos horários disponíveis ou usa "Forçar encaixe".',
      };
    }
  }

  // ── Sobreposição — SEMPRE verificada (ignorando a própria marcação) ──
  const overlapQuery = {
    staffId: data.staffId,
    startTime: newStart,
    endTime: newEnd,
    excludeId: booking._id,
  };
  const overlap = await findOverlappingBooking(overlapQuery);
  if (overlap) {
    return {
      success: false,
      error: `Sobrepõe a marcação ${overlap.bookingNumber} de ${staff.name}. Escolhe outro horário.`,
    };
  }

  const previousStatus = booking.status;
  const dayBeforeSent = booking.remindersSent?.dayBefore ?? false;

  booking.staffId = staff._id;
  booking.startTime = newStart; // endTime é recalculado no pre-validate
  if (booking.remindersSent) booking.remindersSent.dayBefore = false;

  try {
    await booking.save();
  } catch (err) {
    // E11000 = outro pedido ocupou exatamente este início entretanto
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      return { success: false, error: 'Este horário acabou de ser ocupado. Escolhe outro.' };
    }
    console.error('[rescheduleBookingAction]', err);
    return { success: false, error: 'Erro ao remarcar. Tenta novamente.' };
  }

  // Corrida com uma escrita sobreposta de início diferente: repõe a
  // marcação onde estava e avisa. Ver lib/booking/overlap.ts.
  if (await lostWriteRace(overlapQuery)) {
    booking.staffId = oldStaffId;
    booking.startTime = oldStart;
    if (booking.remindersSent) booking.remindersSent.dayBefore = dayBeforeSent;
    try {
      await booking.save();
    } catch (err) {
      console.error('[rescheduleBookingAction] falha ao repor a marcação', err);
    }
    return { success: false, error: 'Este horário acabou de ser ocupado. Escolhe outro.' };
  }

  const fmt = new Intl.DateTimeFormat('pt-PT', {
    timeZone: SALON_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  await logAudit({
    action: 'update',
    resource: 'booking',
    resourceId: String(booking._id),
    resourceLabel: booking.bookingNumber,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message:
      `Marcação ${booking.bookingNumber} remarcada: ${fmt.format(oldStart)} → ${fmt.format(newStart)}` +
      (staffChanged ? ` (agora com ${staff.name})` : '') +
      (data.force ? ' [encaixe forçado]' : ''),
    severity: 'info',
    metadata: {
      oldStart: oldStart.toISOString(),
      newStart: newStart.toISOString(),
      oldStaffId: String(oldStaffId),
      newStaffId: data.staffId,
      force: data.force,
    },
  });

  // Email à cliente — só para marcações futuras já confirmadas (um pedido
  // ainda pendente recebe a confirmação quando o salão o aprovar).
  if (previousStatus === 'confirmed' && newStart.getTime() > Date.now()) {
    const client = booking.clientId
      ? await Client.findById(booking.clientId).select('name email').lean()
      : null;
    await notifyBookingRescheduled({
      bookingNumber: booking.bookingNumber,
      startTime: booking.startTime,
      endTime: booking.endTime,
      previousStartTime: oldStart,
      services: booking.services.map((s) => s.name),
      staffName: staff.name,
      totalPrice: booking.totalPrice,
      client: {
        name: client?.name ?? booking.guestInfo?.name ?? 'Cliente',
        email: client?.email ?? booking.guestInfo?.email,
      },
    });
  }

  return { success: true };
}

// ============================================================
// SEARCH CLIENTS
// ============================================================

export async function searchClientsAction(query: string): Promise<SearchClientsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: true, clients: [] };

  await connectDB();

  if (!query || query.trim().length < 2) {
    return { success: true, clients: [] };
  }

  const q = query.trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const clients = await Client.find({
    $or: [{ name: regex }, { phone: regex }, { email: regex }],
    active: true,
  })
    .limit(10)
    .lean();

  return {
    success: true,
    clients: clients.map((c) => ({
      id: String(c._id),
      name: c.name,
      phone: c.phone,
      email: c.email,
    })),
  };
}

// ============================================================
// META
// ============================================================

export async function getAdminBookingMetaAction(): Promise<AdminBookingMeta> {
  // Todas as exports de um ficheiro 'use server' são endpoints: sem
  // sessão de admin não se devolve nada (antes respondia a qualquer um).
  const admin = await requireAdminSession();
  if (!admin) return { staff: [], services: [], categories: [] };

  await connectDB();

  const [staff, services, categories] = await Promise.all([
    Staff.find({ active: true }).sort({ order: 1 }).lean(),
    Service.find({ active: true }).sort({ order: 1 }).populate('categoryId', 'slug').lean(),
    Category.find({ active: true }).sort({ order: 1 }).lean(),
  ]);

  const FALLBACK_COLOR = '#1F3D2E';

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return {
    staff: staff.map((s: any) => ({
      id: String(s._id),
      name: s.name,
      photo: s.photo,
    })),
    services: services.map((s: any) => ({
      id: String(s._id),
      name: s.name?.pt ?? '',
      price: s.price,
      duration: s.duration,
      bufferAfter: s.bufferAfter ?? 0,
      staffIds: (s.staffIds ?? []).map(String),
      categorySlug: s.categoryId?.slug,
    })),
    categories: categories.map((c: any) => ({
      slug: c.slug,
      name: c.name?.pt ?? c.slug,
      color: c.color ?? FALLBACK_COLOR,
      order: c.order ?? 0,
    })),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
