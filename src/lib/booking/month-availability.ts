// 📄 src/lib/booking/month-availability.ts
/**
 * Chi Sublime — Month Availability
 * ============================================================
 *
 * Calcula o ESTADO de cada dia de um mês para o CalendarPicker,
 * para que o calendário do cliente espelhe fielmente a gestão
 * feita no admin (horário do salão, feriados, exceções, horário
 * semanal e férias de cada profissional, reservas existentes).
 *
 * Estados devolvidos por dia:
 *  - 'past'         → dia já passou (cor própria na UI)
 *  - 'out-of-range' → além do horizonte de reserva (30 dias)
 *  - 'closed'       → salão encerrado (dia de fecho, feriado ou exceção)
 *  - 'staff-off'    → salão aberto, mas o(s) profissional(is) não
 *                     trabalham nesse dia ou estão de férias
 *  - 'full'         → dia válido mas sem nenhum slot livre que caiba
 *  - 'available'    → tem pelo menos 1 slot reservável
 *
 * PERFORMANCE: ao contrário de chamar getAvailableSlots 30x
 * (que faria ~150+ queries), este módulo carrega tudo em 4
 * queries — Schedule (todos), Service, Staff, Bookings do mês —
 * e resolve os dias em memória, reutilizando a MESMA lógica de
 * geração de slots do availability.ts (generateSlotsForStaff),
 * pelo que calendário e grelha de horários nunca divergem.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { Booking, Schedule, Service, Staff, type ISchedule, type IStaff } from '@/lib/models';
import { connectDB } from '@/lib/db/connect';
import {
  combineDateAndTime,
  getCurrentMinutesInLisbon,
  getWeekDay,
  roundUpToInterval,
  SALON_TIMEZONE,
  timeToMinutes,
  toISODate,
} from '@/lib/utils/time-utils';
import type { ResolvedSchedule } from './schedule-resolver';
import type { ExistingBooking } from './conflicts';
import {
  calculateTotalDuration,
  canStaffPerformAllServices,
  generateSlotsForStaff,
  isStaffOnVacation,
} from './availability';
import { BOOKING_RULES } from '@/lib/constants/business';

// ============================================================
// Tipos
// ============================================================

export type CalendarDayState =
  | 'past'
  | 'out-of-range'
  | 'closed'
  | 'staff-off'
  | 'full'
  | 'available';

export type CalendarDay = {
  /** Data ISO YYYY-MM-DD */
  date: string;
  /** Estado para a UI (ver legenda no topo do ficheiro) */
  state: CalendarDayState;
  /** Detalhe humanamente legível (ex: "Feriado — Natal") */
  reason?: string;
  /** Nº de slots livres (só quando state='available') */
  slotsCount?: number;
};

export type MonthAvailabilityInput = {
  /** Ano (ex: 2026) */
  year: number;
  /** Mês 1-12 */
  month: number;
  /** Serviços escolhidos no Step 1 */
  serviceIds: string[];
  /** Staff específico ou 'any' */
  staffId: string | 'any';
};

export type MonthAvailabilityResult = {
  /** YYYY-MM */
  month: string;
  /** Um entry por dia do mês, em ordem */
  days: CalendarDay[];
  /** Hoje (ISO), para a UI marcar o contorno */
  todayISO: string;
  /** Último dia reservável (ISO) — hoje + maxAdvanceDays */
  horizonISO: string;
  error?: { code: 'invalid-services' | 'invalid-staff'; message: string };
};

const WEEKDAY_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export async function getMonthAvailability(
  input: MonthAvailabilityInput,
): Promise<MonthAvailabilityResult> {
  await connectDB();

  const { year, month, serviceIds, staffId } = input;

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const todayISO = toISODate(new Date());
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + BOOKING_RULES.maxAdvanceDays);
  const horizonISO = toISODate(horizon);

  const daysInMonth = new Date(year, month, 0).getDate();

  // ----------------------------------------------------------
  // Guard: sem serviços não há duração → não há cálculo possível
  // ----------------------------------------------------------
  if (!serviceIds || serviceIds.length === 0) {
    return {
      month: monthStr,
      days: [],
      todayISO,
      horizonISO,
      error: { code: 'invalid-services', message: 'Tem de escolher pelo menos 1 servico' },
    };
  }

  // ============================================================
  // CARREGAR TUDO (4 queries, depois só memória)
  // ============================================================

  const [services, allSchedules, allStaff] = await Promise.all([
    Service.find({ _id: { $in: serviceIds }, active: true }).lean(),
    Schedule.find({}).lean(),
    Staff.find({ active: true }).lean(),
  ]);

  if (services.length !== serviceIds.length) {
    return {
      month: monthStr,
      days: [],
      todayISO,
      horizonISO,
      error: {
        code: 'invalid-services',
        message: 'Um ou mais servicos nao foram encontrados ou estao inativos',
      },
    };
  }

  const totalDurationMinutes = calculateTotalDuration(services);

  // Staff qualificados para TODOS os serviços (skill-based, igual ao availability)
  const qualifiedStaff = allStaff.filter((s) => canStaffPerformAllServices(s, services));

  if (staffId !== 'any' && !qualifiedStaff.some((s) => String(s._id) === staffId)) {
    return {
      month: monthStr,
      days: [],
      todayISO,
      horizonISO,
      error: {
        code: 'invalid-staff',
        message: 'Profissional nao foi encontrado ou nao pode prestar este servico',
      },
    };
  }

  // Índices de Schedule em memória (espelham o schedule-resolver)
  const regularByWeekday = new Map<number, ISchedule>();
  const exceptionsByISO = new Map<string, ISchedule>();
  const holidays: ISchedule[] = [];

  for (const s of allSchedules) {
    if (s.type === 'regular' && s.dayOfWeek !== undefined && s.dayOfWeek !== null) {
      regularByWeekday.set(s.dayOfWeek, s);
    } else if (s.type === 'exception' && s.date) {
      exceptionsByISO.set(toISODate(new Date(s.date)), s);
    } else if (s.type === 'holiday' && s.date) {
      holidays.push(s);
    }
  }

  // Reservas ativas do mês inteiro dos staff qualificados (1 query)
  const monthStart = combineDateAndTime(new Date(year, month - 1, 1, 12), '00:00');
  const monthEnd = combineDateAndTime(new Date(year, month - 1, daysInMonth, 12), '23:59');
  const candidateIds = qualifiedStaff.map((s) => String(s._id));

  const monthBookings = await Booking.find({
    staffId: { $in: candidateIds },
    status: { $in: ['pending', 'confirmed', 'in-progress'] },
    startTime: { $gte: monthStart, $lte: monthEnd },
  })
    .select('_id staffId startTime endTime bufferAfter')
    .lean();

  // Agrupar por "staffId|YYYY-MM-DD"
  const bookingsByStaffDay = new Map<string, ExistingBooking[]>();
  for (const b of monthBookings) {
    const key = `${String(b.staffId)}|${toISODate(new Date(b.startTime))}`;
    const arr = bookingsByStaffDay.get(key) ?? [];
    arr.push({
      id: String(b._id),
      startTime: new Date(b.startTime),
      endTime: new Date(b.endTime),
      bufferAfter: b.bufferAfter ?? BOOKING_RULES.defaultBufferMinutes,
    });
    bookingsByStaffDay.set(key, arr);
  }

  // ============================================================
  // RESOLVER CADA DIA DO MÊS (memória pura)
  // ============================================================

  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    // Âncora às 12:00 — weekday/toISODate corretos em qualquer TZ de servidor
    const date = new Date(year, month - 1, d, 12, 0, 0);
    const iso = toISODate(date);

    // 1) Passado
    if (iso < todayISO) {
      days.push({ date: iso, state: 'past' });
      continue;
    }

    // 2) Além do horizonte de reserva
    if (iso > horizonISO) {
      days.push({ date: iso, state: 'out-of-range' });
      continue;
    }

    // 3) Salão aberto? (exception > holiday > regular)
    const schedule = resolveScheduleInMemory(date, iso, {
      regularByWeekday,
      exceptionsByISO,
      holidays,
    });

    if (!schedule.open) {
      days.push({ date: iso, state: 'closed', reason: schedule.reasonDetail });
      continue;
    }

    // 4) Staff disponível neste dia? (dia da semana + férias)
    const weekday = getWeekDay(date);
    let dayCandidates = qualifiedStaff.filter(
      (s) => s.workingHours?.[weekday]?.enabled === true && !isStaffOnVacation(s, date),
    );
    if (staffId !== 'any') {
      dayCandidates = dayCandidates.filter((s) => String(s._id) === staffId);
    }

    if (dayCandidates.length === 0) {
      days.push({
        date: iso,
        state: 'staff-off',
        reason:
          staffId !== 'any'
            ? 'O profissional escolhido nao esta disponivel neste dia'
            : 'Nenhum profissional disponivel neste dia',
      });
      continue;
    }

    // 5) Há pelo menos 1 slot que caiba? (mesma lógica do availability)
    const slotTimes = new Set<string>();
    for (const staff of dayCandidates) {
      const key = `${String(staff._id)}|${iso}`;
      const slots = generateSlotsForStaff({
        date,
        staff: staff as IStaff,
        schedule,
        totalDurationMinutes,
        existingBookings: bookingsByStaffDay.get(key) ?? [],
      });
      for (const t of slots) slotTimes.add(t);
    }

    // Antecedência mínima se for hoje
    if (iso === todayISO) {
      const minSlotMinutes = roundUpToInterval(
        getCurrentMinutesInLisbon() + BOOKING_RULES.minAdvanceHours * 60,
        BOOKING_RULES.slotIntervalMinutes,
      );
      for (const t of Array.from(slotTimes)) {
        if (timeToMinutes(t) < minSlotMinutes) slotTimes.delete(t);
      }
    }

    if (slotTimes.size === 0) {
      days.push({ date: iso, state: 'full', reason: 'Sem horarios livres neste dia' });
    } else {
      days.push({ date: iso, state: 'available', slotsCount: slotTimes.size });
    }
  }

  return { month: monthStr, days, todayISO, horizonISO };
}

// ============================================================
// Resolver de horário do salão EM MEMÓRIA
// (espelha fielmente schedule-resolver.ts: exception > holiday > regular)
// ============================================================

function resolveScheduleInMemory(
  date: Date,
  iso: string,
  indexes: {
    regularByWeekday: Map<number, ISchedule>;
    exceptionsByISO: Map<string, ISchedule>;
    holidays: ISchedule[];
  },
): ResolvedSchedule {
  // 1) Exception para a data exata
  const exception = indexes.exceptionsByISO.get(iso);
  if (exception) {
    if (!exception.open) {
      return {
        open: false,
        breaks: [],
        reason: 'exception-closed',
        reasonDetail: exception.reason || 'Encerrado nesta data',
        source: 'exception',
      };
    }
    return {
      open: true,
      start: exception.start,
      end: exception.end,
      breaks: exception.breaks ?? [],
      source: 'exception',
    };
  }

  // 2) Holiday (exato ou recurringYearly), mês/dia SEMPRE no fuso de Lisboa
  const month = formatInTimeZone(date, SALON_TIMEZONE, 'MM');
  const day = formatInTimeZone(date, SALON_TIMEZONE, 'dd');

  for (const h of indexes.holidays) {
    if (!h.date) continue;
    const hDate = new Date(h.date);

    if (toISODate(hDate) === iso) {
      return {
        open: false,
        breaks: [],
        reason: 'holiday',
        reasonDetail: h.reason || 'Feriado',
        source: 'holiday',
      };
    }

    if (h.recurringYearly) {
      const hMonth = formatInTimeZone(hDate, SALON_TIMEZONE, 'MM');
      const hDay = formatInTimeZone(hDate, SALON_TIMEZONE, 'dd');
      if (hMonth === month && hDay === day) {
        return {
          open: false,
          breaks: [],
          reason: 'holiday',
          reasonDetail: h.reason || 'Feriado',
          source: 'holiday',
        };
      }
    }
  }

  // 3) Regular do dia da semana
  const weekday = getWeekDay(date);
  const regular = indexes.regularByWeekday.get(WEEKDAY_TO_NUMBER[weekday]);

  if (!regular || !regular.open) {
    return {
      open: false,
      breaks: [],
      reason: 'closed',
      reasonDetail: 'Encerrado neste dia da semana',
      source: 'regular',
    };
  }

  return {
    open: true,
    start: regular.start,
    end: regular.end,
    breaks: regular.breaks ?? [],
    source: 'regular',
  };
}
