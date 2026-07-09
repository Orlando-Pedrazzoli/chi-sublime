/**
 * Chi Sublime — Availability Algorithm
 * ============================================================
 *
 * Algoritmo principal para calcular slots disponiveis.
 *
 * Best practices implementadas (industria 2025-2026):
 *  - Skill-based filtering (so staff que pode prestar o servico)
 *  - Buffer time SEMPRE aplicado entre reservas
 *  - Slots de 30min (padrao da industria)
 *  - Esconde slots indisponiveis (em vez de greyed out)
 *  - Antecedencia minima 1h, maxima 30 dias
 *  - Multi-service contiguous booking com mesmo staff
 *  - Load balancing para "qualquer staff" (menor ocupacao)
 *  - Respeita: salao hours, holidays, exceptions, staff vacations,
 *    staff working hours, breaks, reservas existentes
 *
 * Output:
 *  - Lista de slots ["10:00", "10:30", ...]
 *  - Cada slot tem o staff alocado
 *  - Metadados completos para debugging
 */

import { Booking, Service, Staff, type IService, type IStaff } from '@/lib/models';
import { connectDB } from '@/lib/db/connect';
import {
  combineDateAndTime,
  getCurrentMinutesInLisbon,
  getWeekDay,
  isSameDay,
  minutesToTime,
  roundUpToInterval,
  timeToMinutes,
  toISODate,
} from '@/lib/utils/time-utils';
import { resolveSchedule, type ResolvedSchedule } from './schedule-resolver';
import {
  slotConflictsWithBookings,
  slotConflictsWithBreaks,
  type Break,
  type ExistingBooking,
} from './conflicts';
import { pickLeastOccupiedStaff } from './staff-allocator';
import { BOOKING_RULES } from '@/lib/constants/business';

// ============================================================
// Constantes (single source of truth em constants/business.ts)
// ============================================================

const SLOT_INTERVAL_MINUTES = BOOKING_RULES.slotIntervalMinutes;
const MIN_ADVANCE_HOURS = BOOKING_RULES.minAdvanceHours;
const MAX_ADVANCE_DAYS = BOOKING_RULES.maxAdvanceDays;
const DEFAULT_BUFFER_MINUTES = BOOKING_RULES.defaultBufferMinutes;

// ============================================================
// Tipos
// ============================================================

export type AvailabilityInput = {
  /** Data da reserva (apenas dia e considerado) */
  date: Date;
  /** IDs dos servicos pretendidos (1 ou mais) */
  serviceIds: string[];
  /** Staff especifico ou "any" para qualquer disponivel */
  staffId: string | 'any';
};

export type AvailableSlot = {
  /** Hora do slot "HH:MM" */
  time: string;
  /** Staff alocado para este slot (sempre preenchido) */
  staffId: string;
  /** Nome do staff (para mostrar na UI) */
  staffName: string;
  /** Hora de fim calculada (slot + duracao total) */
  endTime: string;
};

export type AvailabilityResult = {
  /** Data ISO YYYY-MM-DD */
  date: string;
  /** Slots disponiveis (ja com staff atribuido) */
  slots: AvailableSlot[];
  /** Metadados para debugging e UI */
  metadata: {
    /** Salao aberto neste dia? */
    salonOpen: boolean;
    /** Razao se fechado */
    closedReason?: string;
    /** Detalhe humanamente legivel */
    closedReasonDetail?: string;
    /** Duracao total dos servicos (com buffers) */
    totalDurationMinutes: number;
    /** Staff que foram considerados */
    candidateStaffIds: string[];
    /** Nomes dos servicos para UI */
    serviceNames: string[];
  };
  /** Erro de validacao (se houver) */
  error?: AvailabilityError;
};

export type AvailabilityError =
  | { code: 'no-past'; message: string }
  | { code: 'too-soon'; message: string }
  | { code: 'too-far'; message: string }
  | { code: 'invalid-services'; message: string }
  | { code: 'invalid-staff'; message: string }
  | { code: 'no-qualified-staff'; message: string };

// ============================================================
// FUNCAO PRINCIPAL
// ============================================================

/**
 * Calcula slots disponiveis para uma reserva.
 *
 * @example
 * const result = await getAvailableSlots({
 *   date: new Date("2026-05-07"),
 *   serviceIds: ["service-1", "service-2"],
 *   staffId: "any",
 * });
 *
 * // result.slots = [{ time: "10:00", staffId: "...", staffName: "Jean Pierre", ... }, ...]
 */
export async function getAvailableSlots(input: AvailabilityInput): Promise<AvailabilityResult> {
  await connectDB();

  const { date, serviceIds, staffId } = input;

  // ============================================================
  // PASSO 1 — VALIDACOES INICIAIS
  // ============================================================

  const dateValidation = validateDate(date);
  if (dateValidation) {
    return errorResult(date, dateValidation);
  }

  if (!serviceIds || serviceIds.length === 0) {
    return errorResult(date, {
      code: 'invalid-services',
      message: 'Tem de escolher pelo menos 1 servico',
    });
  }

  // Buscar servicos
  const services = await Service.find({
    _id: { $in: serviceIds },
    active: true,
  }).lean();

  if (services.length !== serviceIds.length) {
    return errorResult(date, {
      code: 'invalid-services',
      message: 'Um ou mais servicos nao foram encontrados ou estao inativos',
    });
  }

  // Calcular duracao total (soma de duracoes + buffers)
  const totalDurationMinutes = calculateTotalDuration(services);
  const serviceNames = services.map((s) => s.name.pt);

  // ============================================================
  // PASSO 2 — RESOLVER HORARIO DO SALAO
  // ============================================================

  const schedule = await resolveSchedule(date);

  if (!schedule.open) {
    return {
      date: toISODate(date),
      slots: [],
      metadata: {
        salonOpen: false,
        closedReason: schedule.reason,
        closedReasonDetail: schedule.reasonDetail,
        totalDurationMinutes,
        candidateStaffIds: [],
        serviceNames,
      },
    };
  }

  // ============================================================
  // PASSO 3 — DETERMINAR STAFF CANDIDATOS
  // ============================================================

  const allStaff = await Staff.find({ active: true }).lean();

  // Filtro 1: Skill-based (staff capaz de prestar TODOS os servicos pedidos)
  const qualifiedStaff = allStaff.filter((staff) => canStaffPerformAllServices(staff, services));

  // Filtro 2: Trabalha neste dia da semana
  const weekday = getWeekDay(date);
  const workingStaff = qualifiedStaff.filter((staff) => {
    const config = staff.workingHours?.[weekday];
    return config?.enabled === true;
  });

  // Filtro 3: Nao esta de ferias
  const availableStaff = workingStaff.filter((staff) => !isStaffOnVacation(staff, date));

  // Filtro 4: Se staffId especifico, restringir
  let candidates = availableStaff;
  if (staffId !== 'any') {
    candidates = availableStaff.filter((s) => String(s._id) === staffId);
    if (candidates.length === 0) {
      // Verificar se o staff existe mas esta de ferias / nao trabalha este dia
      const staffExists = qualifiedStaff.some((s) => String(s._id) === staffId);
      if (!staffExists) {
        return errorResult(date, {
          code: 'invalid-staff',
          message: 'Profissional nao foi encontrado ou nao pode prestar este servico',
        });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      date: toISODate(date),
      slots: [],
      metadata: {
        salonOpen: true,
        totalDurationMinutes,
        candidateStaffIds: [],
        serviceNames,
      },
      error: {
        code: 'no-qualified-staff',
        message: 'Nenhum profissional disponivel neste dia para os servicos escolhidos',
      },
    };
  }

  // ============================================================
  // PASSO 4 — PARA CADA STAFF, GERAR SLOTS LIVRES
  // ============================================================

  const candidateStaffIds = candidates.map((s) => String(s._id));

  // Buscar TODAS as reservas dos staff candidatos no dia (otimizacao)
  const dayStart = combineDateAndTime(date, '00:00');
  const dayEnd = combineDateAndTime(date, '23:59');
  const allBookingsToday = await Booking.find({
    staffId: { $in: candidateStaffIds },
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    startTime: { $gte: dayStart, $lte: dayEnd },
  })
    .select('_id staffId startTime endTime bufferAfter')
    .lean();

  // Agrupar reservas por staffId. Usa o bufferAfter REAL gravado em cada
  // reserva (não um valor fixo) — assim o buffer de limpeza configurado
  // no serviço é respeitado na deteção de conflito.
  const bookingsByStaff = new Map<string, ExistingBooking[]>();
  for (const b of allBookingsToday) {
    const sid = String(b.staffId);
    const existing = bookingsByStaff.get(sid) ?? [];
    existing.push({
      id: String(b._id),
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime),
      bufferAfter: b.bufferAfter ?? DEFAULT_BUFFER_MINUTES,
    });
    bookingsByStaff.set(sid, existing);
  }

  // Para cada staff, gerar slots livres
  // Mapa: slot time → array de staff disponiveis
  const slotAvailability = new Map<string, { id: string; name: string }[]>();

  for (const staff of candidates) {
    const staffSlots = generateSlotsForStaff({
      date,
      staff,
      schedule,
      totalDurationMinutes,
      existingBookings: bookingsByStaff.get(String(staff._id)) ?? [],
    });

    for (const slot of staffSlots) {
      const existing = slotAvailability.get(slot) ?? [];
      existing.push({ id: String(staff._id), name: staff.name });
      slotAvailability.set(slot, existing);
    }
  }

  // ============================================================
  // PASSO 5 — APLICAR ANTECEDENCIA MINIMA (se hoje)
  // ============================================================

  if (isSameDay(date, new Date())) {
    const minSlotMinutes = roundUpToInterval(
      getCurrentMinutesInLisbon() + MIN_ADVANCE_HOURS * 60,
      SLOT_INTERVAL_MINUTES,
    );
    for (const [time] of slotAvailability) {
      if (timeToMinutes(time) < minSlotMinutes) {
        slotAvailability.delete(time);
      }
    }
  }

  // ============================================================
  // PASSO 6 — STAFF ALLOCATION (load balancing)
  // ============================================================

  const finalSlots: AvailableSlot[] = [];

  // Cache de ocupacao por staff (evita queries repetidas)
  const sortedTimes = Array.from(slotAvailability.keys()).sort();

  for (const time of sortedTimes) {
    const availableForSlot = slotAvailability.get(time)!;
    const allocated = await pickLeastOccupiedStaff(availableForSlot, date);
    if (!allocated) continue;

    const slotEnd = minutesToTime(timeToMinutes(time) + totalDurationMinutes);

    finalSlots.push({
      time,
      staffId: allocated.id,
      staffName: allocated.name,
      endTime: slotEnd,
    });
  }

  // ============================================================
  // PASSO 7 — DEVOLVER RESULTADO
  // ============================================================

  return {
    date: toISODate(date),
    slots: finalSlots,
    metadata: {
      salonOpen: true,
      totalDurationMinutes,
      candidateStaffIds,
      serviceNames,
    },
  };
}

// ============================================================
// FUNCOES INTERNAS
// ============================================================

function validateDate(date: Date): AvailabilityError | null {
  const now = new Date();

  // Passado?
  if (date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    return {
      code: 'no-past',
      message: 'Nao e possivel reservar para datas passadas',
    };
  }

  // Mais de 30 dias futuro?
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);
  if (date.getTime() > maxDate.getTime()) {
    return {
      code: 'too-far',
      message: `Reservas so podem ser feitas ate ${MAX_ADVANCE_DAYS} dias de antecedencia`,
    };
  }

  return null;
}

function calculateTotalDuration(services: IService[]): number {
  let total = 0;
  for (let i = 0; i < services.length; i++) {
    total += services[i].duration;
    // Aplica buffer apos cada servico EXCETO o ultimo
    // (buffer no fim e desperdicio se a reserva acabou)
    if (i < services.length - 1) {
      total += services[i].bufferAfter ?? 0;
    }
  }
  return total;
}

function canStaffPerformAllServices(staff: IStaff, services: IService[]): boolean {
  for (const service of services) {
    // Se servico nao tem staffIds especificado, qualquer staff pode fazer
    if (!service.staffIds || service.staffIds.length === 0) continue;

    // Senao, staff tem de estar no array
    const canPerform = service.staffIds.some((id) => String(id) === String(staff._id));
    if (!canPerform) return false;
  }
  return true;
}

function isStaffOnVacation(staff: IStaff, date: Date): boolean {
  if (!staff.vacations || staff.vacations.length === 0) return false;
  const dateTime = date.getTime();
  return staff.vacations.some((vac) => {
    const from = new Date(vac.from).getTime();
    const to = new Date(vac.to).getTime();
    return dateTime >= from && dateTime <= to;
  });
}

/**
 * Gera todos os slots livres para um staff especifico nesse dia.
 */
function generateSlotsForStaff(params: {
  date: Date;
  staff: IStaff;
  schedule: ResolvedSchedule;
  totalDurationMinutes: number;
  existingBookings: ExistingBooking[];
}): string[] {
  const { date, staff, schedule, totalDurationMinutes, existingBookings } = params;
  const weekday = getWeekDay(date);
  const staffConfig = staff.workingHours[weekday];

  if (!staffConfig?.enabled || !schedule.start || !schedule.end) {
    return [];
  }

  // Working window = intersecao salao ∩ staff
  const salonStart = timeToMinutes(schedule.start);
  const salonEnd = timeToMinutes(schedule.end);
  const staffStart = timeToMinutes(staffConfig.start);
  const staffEnd = timeToMinutes(staffConfig.end);

  const windowStart = Math.max(salonStart, staffStart);
  const windowEnd = Math.min(salonEnd, staffEnd);

  // Breaks combinados
  const allBreaks: Break[] = [...(schedule.breaks ?? []), ...(staffConfig.breaks ?? [])];

  // Gerar slots candidatos em intervalos de 30min
  const slots: string[] = [];
  let current = roundUpToInterval(windowStart, SLOT_INTERVAL_MINUTES);
  const lastPossibleStart = windowEnd - totalDurationMinutes;

  while (current <= lastPossibleStart) {
    const slotStart = current;
    const slotEnd = current + totalDurationMinutes;

    // Verificar conflito com breaks
    const breakConflict = slotConflictsWithBreaks(slotStart, slotEnd, allBreaks);

    if (!breakConflict) {
      // Verificar conflito com reservas existentes
      const slotStartDate = combineDateAndTime(date, minutesToTime(slotStart));
      const slotEndDate = combineDateAndTime(date, minutesToTime(slotEnd));

      const bookingConflict = slotConflictsWithBookings(
        slotStartDate,
        slotEndDate,
        existingBookings,
      );

      if (!bookingConflict.hasConflict) {
        slots.push(minutesToTime(slotStart));
      }
    }

    current += SLOT_INTERVAL_MINUTES;
  }

  return slots;
}

function errorResult(date: Date, error: AvailabilityError): AvailabilityResult {
  return {
    date: toISODate(date),
    slots: [],
    metadata: {
      salonOpen: false,
      totalDurationMinutes: 0,
      candidateStaffIds: [],
      serviceNames: [],
    },
    error,
  };
}
