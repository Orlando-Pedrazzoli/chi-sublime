// 📄 src/lib/constants/business.ts
/**
 * Chi Sublime — Regras de negócio (single source of truth)
 * ============================================================
 *
 * Todos os números de política do salão vivem aqui.
 * Alterar uma regra = alterar num único sítio.
 */

// ============================================================
// TIMEZONE
// ============================================================

export const SALON_TIMEZONE = 'Europe/Lisbon';

// ============================================================
// HORÁRIO DE FUNCIONAMENTO — FONTE DE VERDADE
// ============================================================
/**
 * ✅ Horário confirmado pelo cliente (Jean Pierre, jul/2026):
 *
 *   Segunda    Encerrado
 *   Terça      09:00 – 18:00
 *   Quarta     09:00 – 18:00
 *   Quinta     09:00 – 18:00
 *   Sexta      09:00 – 18:00
 *   Sábado     09:00 – 18:00
 *   Domingo    Encerrado
 *
 * ⚠️ ÚNICO SÍTIO ONDE O HORÁRIO SE ALTERA NO CÓDIGO.
 *
 * ⚠️ Alterar aqui NÃO altera a base de dados. O motor de reservas
 * (schedule-resolver) lê a coleção `Schedule` e o availability.ts
 * cruza-a com `Staff.workingHours`. Depois de mudar isto, correr:
 *     npx tsx scripts/fix-salon-hours.ts
 */

/** 0 = Domingo … 6 = Sábado (igual a Date#getDay e a Schedule.dayOfWeek) */
export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Nomes usados em Staff.workingHours */
export type WeekDayName =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type SalonDayHours =
  | { open: false; start?: undefined; end?: undefined }
  | { open: true; start: string; end: string };

/** Horas por defeito (placeholder dos editores e de dias fechados) */
export const SALON_DEFAULT_START = '09:00';
export const SALON_DEFAULT_END = '18:00';

const OPEN_DAY: SalonDayHours = {
  open: true,
  start: SALON_DEFAULT_START,
  end: SALON_DEFAULT_END,
};
const CLOSED_DAY: SalonDayHours = { open: false };

/** Horário semanal indexado por dia (0 = Domingo … 6 = Sábado) */
export const SALON_HOURS: Record<WeekDayIndex, SalonDayHours> = {
  0: { ...CLOSED_DAY }, // Domingo — Encerrado
  1: { ...CLOSED_DAY }, // Segunda — Encerrado
  2: { ...OPEN_DAY }, //   Terça   — 09:00–18:00
  3: { ...OPEN_DAY }, //   Quarta  — 09:00–18:00
  4: { ...OPEN_DAY }, //   Quinta  — 09:00–18:00
  5: { ...OPEN_DAY }, //   Sexta   — 09:00–18:00
  6: { ...OPEN_DAY }, //   Sábado  — 09:00–18:00
};

/** Ordem canónica, indexada por WeekDayIndex (domingo = 0) */
export const WEEKDAY_NAMES: readonly WeekDayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** Mesmo horário, indexado pelos nomes usados em Staff.workingHours */
export const SALON_HOURS_BY_NAME = WEEKDAY_NAMES.reduce(
  (acc, name, index) => {
    acc[name] = SALON_HOURS[index as WeekDayIndex];
    return acc;
  },
  {} as Record<WeekDayName, SalonDayHours>,
);

/** Nomes Schema.org para o JSON-LD, indexados por WeekDayIndex */
export const SCHEMA_ORG_DAYS: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/* ── Helpers ─────────────────────────────────────────────── */

/** O salão abre neste dia da semana? */
export function isSalonOpenOn(day: WeekDayIndex): boolean {
  return SALON_HOURS[day].open;
}

/**
 * Próximo dia da semana em que o salão abre, a partir de `from`.
 * offset 0 = hoje, 1 = amanhã. Null se nunca abrir (defensivo).
 */
export function nextOpenDay(
  from: WeekDayIndex,
  { includeToday = false } = {},
): { day: WeekDayIndex; offset: number; hours: SalonDayHours } | null {
  for (let offset = includeToday ? 0 : 1; offset <= 7; offset++) {
    const day = ((from + offset) % 7) as WeekDayIndex;
    const hours = SALON_HOURS[day];
    if (hours.open) return { day, offset, hours };
  }
  return null;
}

export type SalonHoursGroup = {
  days: WeekDayIndex[];
  open: boolean;
  start?: string;
  end?: string;
};

/**
 * Agrupa dias consecutivos com o mesmo horário, para apresentação.
 * Percorre a semana de Segunda → Domingo (como se lê num cartaz).
 * Com o horário atual devolve:
 *   [{ [1], open:false }, { [2,3,4,5,6], 09:00–18:00 }, { [0], open:false }]
 */
export function groupSalonHours(): SalonHoursGroup[] {
  const order: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0];
  const groups: SalonHoursGroup[] = [];

  for (const day of order) {
    const h = SALON_HOURS[day];
    const last = groups[groups.length - 1];
    const same = last && last.open === h.open && last.start === h.start && last.end === h.end;

    if (same) last.days.push(day);
    else groups.push({ days: [day], open: h.open, start: h.start, end: h.end });
  }

  return groups;
}

/** Menor hora de abertura e maior hora de fecho da semana (para grelhas de UI) */
export function salonHoursBounds(): { earliestHour: number; latestHour: number } {
  let earliest = 24;
  let latest = 0;
  for (const day of Object.values(SALON_HOURS)) {
    if (!day.open) continue;
    earliest = Math.min(earliest, Number(day.start.slice(0, 2)));
    latest = Math.max(
      latest,
      Math.ceil(Number(day.end.slice(0, 2)) + Number(day.end.slice(3)) / 60),
    );
  }
  if (earliest === 24) return { earliestHour: 9, latestHour: 19 };
  return { earliestHour: earliest, latestHour: latest };
}

// ============================================================
// AGENDAMENTO
// ============================================================

export const BOOKING_RULES = {
  /** Intervalo da grelha de slots mostrada ao cliente (min) */
  slotIntervalMinutes: 30,
  /** Antecedência mínima para reservar (horas) */
  minAdvanceHours: 1,
  /** Antecedência máxima para reservar (dias) */
  maxAdvanceDays: 30,
  /** Buffer aplicado após cada reserva por defeito (min) */
  defaultBufferMinutes: 5,
  /** Janela mínima para o cliente cancelar/reagendar sozinho (horas) */
  cancellationWindowHours: 24,
  /**
   * Janela da vista "Próximas" no /admin/reservas (dias).
   * Tem de cobrir pelo menos maxAdvanceDays, senão o salão faz uma
   * reserva que o cliente consegue marcar mas que não aparece na lista.
   */
  upcomingViewDays: 60,
} as const;

// ============================================================
// TOGGLES DE POLÍTICA
// ============================================================

export const BOOKING_POLICY = {
  allowClientReschedule: true,
  allowWaitlist: true,
  approvalMode: 'auto' as 'auto' | 'manual',
  maxOnlineBookingsPerHour: 3,
} as const;

// ============================================================
// FALLBACKS DE CONTACTO (a fonte real é a BD)
// ============================================================

export const SALON_CONTACT_FALLBACK = {
  name: 'Chi Sublime',
  phone: '+351 932 932 691',
  email: 'contacto@chisublime.pt',
  address: 'R. Estorninho, Loja E, Quinta da Bicuda',
  postalCode: '2750-686',
  city: 'Cascais',
  instagram: 'https://www.instagram.com/chiptsublime/',
} as const;

// ============================================================
// PAGINAÇÃO / UI
// ============================================================

export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
