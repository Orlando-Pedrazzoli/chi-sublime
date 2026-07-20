// 📄 src/lib/server-actions/admin-bookings.ts
'use server';

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import {
  Booking,
  Client,
  Service,
  Staff,
  generateBookingNumber,
  logAudit,
  type IBooking,
} from '@/lib/models';
import { auth } from '@/lib/auth';
import { combineDateAndTime, timeToMinutes, minutesToTime } from '@/lib/utils/time-utils';

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
  services: Array<{ name: string; price: number; duration: number }>;
};

export type DayBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; date: string }
  | { success: false; error: string };

export type WeekBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; weekStart: string; weekEnd: string }
  | { success: false; error: string };

export type SimpleResult = { success: true } | { success: false; error: string };

export type CreateBookingResult =
  | { success: true; bookingNumber: string }
  | { success: false; error: string };

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
    categorySlug?: string;
  }>;
};

export type CreateManualBookingInput = {
  clientId?: string;
  newClient?: {
    name: string;
    phone: string;
    email?: string;
  };
  serviceIds: string[];
  staffId: string;
  date: string;
  time: string;
  source: 'phone' | 'walk-in' | 'instagram' | 'website';
  initialStatus?: 'pending' | 'confirmed';
  notes?: string;
};

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  x.setMilliseconds(-1);
  return x;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
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
      : { id: '', name: 'Cliente removido', phone: '' },
    staff: staff
      ? {
          id: String(staff._id),
          name: staff.name,
          photo: staff.photo,
        }
      : null,
    services: (doc.services ?? []).map((s: any) => ({
      name: s.name,
      price: s.price,
      duration: s.duration,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================
// GET BY DAY
// ============================================================

export async function getBookingsByDayAction(dateStr: string): Promise<DayBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  try {
    const date = parseDate(dateStr);
    const start = startOfDay(date);
    const end = endOfDay(date);

    const bookings = await Booking.find({
      startTime: { $gte: start, $lte: end },
    })
      .sort({ startTime: 1 })
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name photo')
      .lean();

    return {
      success: true,
      bookings: bookings.map(formatBooking),
      date: dateStr,
    };
  } catch (err) {
    console.error('[getBookingsByDayAction]', err);
    return { success: false, error: 'Erro ao buscar reservas' };
  }
}

// ============================================================
// GET BY WEEK
// ============================================================

export async function getBookingsByWeekAction(dateStr: string): Promise<WeekBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  try {
    const date = parseDate(dateStr);
    const start = startOfWeek(date);
    const end = endOfWeek(date);

    const bookings = await Booking.find({
      startTime: { $gte: start, $lte: end },
    })
      .sort({ startTime: 1 })
      .populate('clientId', 'name phone email')
      .populate('staffId', 'name photo')
      .lean();

    return {
      success: true,
      bookings: bookings.map(formatBooking),
      weekStart: toDateString(start),
      weekEnd: toDateString(end),
    };
  } catch (err) {
    console.error('[getBookingsByWeekAction]', err);
    return { success: false, error: 'Erro ao buscar reservas' };
  }
}

// ============================================================
// GET UPCOMING (lista "Próximas")
// ============================================================

export type UpcomingBookingsResult =
  | { success: true; bookings: AdminBookingForList[]; from: string; to: string }
  | { success: false; error: string };

/**
 * Reservas ativas (pending/confirmed/in-progress) desde o início do
 * dia indicado até `days` dias à frente. Alimenta a vista "Próximas"
 * da agenda e o hint de dia vazio.
 */
export async function getUpcomingBookingsAction(
  fromDateStr: string,
  days = 14,
): Promise<UpcomingBookingsResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  try {
    const from = startOfDay(parseDate(fromDateStr));
    const to = new Date(from);
    to.setDate(to.getDate() + Math.min(Math.max(days, 1), 60));

    const bookings = await Booking.find({
      startTime: { $gte: from, $lt: to },
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
      to: toDateString(to),
    };
  } catch (err) {
    console.error('[getUpcomingBookingsAction]', err);
    return { success: false, error: 'Erro ao buscar próximas reservas' };
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
  if (!booking) return { success: false, error: 'Reserva não encontrada' };

  const oldStatus = booking.status;
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

  return { success: true };
}

// ============================================================
// CREATE MANUAL
// ============================================================

export async function createManualBookingAction(
  input: CreateManualBookingInput,
): Promise<CreateBookingResult> {
  const admin = await requireAdminSession();
  if (!admin) return { success: false, error: 'Não autorizado' };

  await connectDB();

  let clientDoc;
  if (input.clientId) {
    clientDoc = await Client.findById(input.clientId);
    if (!clientDoc) return { success: false, error: 'Cliente não encontrado' };
  } else if (input.newClient) {
    if (!input.newClient.name?.trim() || !input.newClient.phone?.trim()) {
      return { success: false, error: 'Nome e telefone do cliente obrigatórios' };
    }
    const existing = await Client.findOne({
      phone: input.newClient.phone.trim(),
      active: true,
    });
    if (existing) {
      clientDoc = existing;
    } else {
      clientDoc = await Client.create({
        name: input.newClient.name.trim(),
        phone: input.newClient.phone.trim(),
        email: input.newClient.email?.trim() || undefined,
        source: input.source,
        active: true,
      });
    }
  } else {
    return { success: false, error: 'Cliente ou newClient obrigatório' };
  }

  const services = await Service.find({
    _id: { $in: input.serviceIds },
    active: true,
  }).lean();

  if (services.length === 0) {
    return { success: false, error: 'Serviços não encontrados' };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const staff: any = await Staff.findById(input.staffId).lean();
  if (!staff) return { success: false, error: 'Profissional não encontrado' };

  const dateObj = parseDate(input.date);
  const startTime = combineDateAndTime(dateObj, input.time);

  // Itens na ordem escolhida — a ordem define os buffers ENTRE serviços.
  const serviceItems = input.serviceIds.map((sid: string) => {
    const s: any = services.find((srv: any) => String(srv._id) === sid)!;
    return {
      serviceId: s._id,
      name: s.name.pt,
      price: s.price,
      duration: s.duration,
      bufferAfter: s.bufferAfter ?? 0,
    };
  });

  // totalDuration = durações + buffers ENTRE serviços (coerente com o fluxo
  // online e com o pre-validate do model, evitando divergência admin/site).
  let totalDuration = 0;
  for (let i = 0; i < serviceItems.length; i++) {
    totalDuration += serviceItems[i].duration;
    if (i < serviceItems.length - 1) totalDuration += serviceItems[i].bufferAfter ?? 0;
  }
  const endTime = combineDateAndTime(
    dateObj,
    minutesToTime(timeToMinutes(input.time) + totalDuration),
  );

  const conflict = await Booking.findOne({
    staffId: input.staffId,
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    $or: [
      { startTime: { $gte: startTime, $lt: endTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
    ],
  }).lean();

  if (conflict) {
    return {
      success: false,
      error: `Conflito: ${staff.name} já tem reserva neste horário.`,
    };
  }

  const totalPrice = serviceItems.reduce(
    (sum: number, item: { price: number }) => sum + item.price,
    0,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const bookingNumber = await generateBookingNumber();

  try {
    await Booking.create({
      bookingNumber,
      clientId: clientDoc._id,
      staffId: input.staffId,
      services: serviceItems,
      totalDuration,
      totalPrice,
      startTime,
      endTime,
      status: input.initialStatus ?? 'confirmed',
      source: input.source,
      notes: input.notes,
      remindersSent: { confirmation: false, dayBefore: false, hourBefore: false },
      internalNotes: `Criado pelo admin: ${admin.name}`,
    });
  } catch (err) {
    // E11000 = índice único anti-double-booking: o staff já ficou ocupado
    // neste instante entre o conflict-check e o create.
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      return {
        success: false,
        error: `Conflito: ${staff.name} já tem reserva neste horário.`,
      };
    }
    throw err;
  }

  await logAudit({
    action: 'create',
    resource: 'booking',
    resourceLabel: bookingNumber,
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Reserva manual: ${bookingNumber} (${input.source}) — ${clientDoc.name}`,
    severity: 'info',
    metadata: {
      bookingNumber,
      source: input.source,
      totalPrice,
      clientId: String(clientDoc._id),
    },
  });

  return { success: true, bookingNumber };
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
  await connectDB();

  const [staff, services] = await Promise.all([
    Staff.find({ active: true }).sort({ order: 1 }).lean(),
    Service.find({ active: true }).sort({ order: 1 }).populate('categoryId', 'slug').lean(),
  ]);

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
      categorySlug: s.categoryId?.slug,
    })),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
