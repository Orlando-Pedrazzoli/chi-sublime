// 📄 src/components/booking/CalendarPicker.tsx
'use client';

/**
 * Chi Sublime — Calendar Picker (Step 2)
 * ============================================================
 *
 * Calendario mensal 100% ORIENTADO PELOS DADOS DO ADMIN, via
 * getMonthAvailabilityAction (horario do salao, feriados,
 * excecoes, horario semanal e ferias de cada profissional,
 * reservas existentes).
 *
 * MUDANCA vs versao anterior: os fins de semana deixaram de
 * estar bloqueados hardcoded — se o admin abrir o salao ao
 * sabado, o sabado abre aqui automaticamente.
 *
 * Estados visuais por dia:
 *  - PASSADO       → cor propria (areia), nao clicavel
 *  - INDISPONIVEL  → opaco (~35%): fechado, feriado, folga/ferias
 *                    do profissional, ou alem do horizonte
 *  - ESGOTADO      → numero riscado (aberto mas sem vagas)
 *  - DISPONIVEL    → normal, hover dourado, touch target amplo
 *  - HOJE          → contorno dourado
 *  - SELECIONADO   → preenchido verde profundo
 *
 * Cache por mes+staff+servicos para navegacao instantanea.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMonthAvailabilityAction } from '@/lib/server-actions/calendar';
import type { CalendarDay } from '@/lib/booking/month-availability';
import { cn } from '@/lib/utils/cn';

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const STATE_TOOLTIP: Record<string, string> = {
  past: 'Data passada',
  'out-of-range': 'Fora do período de reserva',
  closed: 'Salão encerrado',
  'staff-off': 'Profissional indisponível',
  full: 'Sem horários livres',
};

type Props = {
  /** Data selecionada (ISO YYYY-MM-DD ou null) */
  selectedDate: string | null;
  /** Callback quando data e selecionada */
  onSelectDate: (isoDate: string) => void;
  /** Servicos escolhidos no Step 1 (necessario para calcular vagas) */
  serviceIds: string[];
  /** Staff escolhido ('any' ou id) */
  staffId: string;
  /** Maximo de dias futuros permitidos (para limites de navegacao) */
  maxDaysAhead?: number;
};

// ============================================================
// HELPERS
// ============================================================

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Grelha retangular do mes (com preenchimento), a comecar a Segunda. */
function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7;

  const days: Date[] = [];

  for (let i = firstWeekday; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  for (let i = 1; i <= 6 - lastWeekday; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// ============================================================
// COMPONENTE
// ============================================================

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  serviceIds,
  staffId,
  maxDaysAhead = 30,
}: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxDaysAhead);
    return d;
  }, [today, maxDaysAhead]);

  // Mes/ano em vista
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  // Disponibilidade do mes em vista
  const [daysByISO, setDaysByISO] = useState<Map<string, CalendarDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cache: "staffId|servicos|YYYY-MM" → CalendarDay[]
  const cacheRef = useRef<Map<string, CalendarDay[]>>(new Map());
  const serviceKey = useMemo(() => [...serviceIds].sort().join(','), [serviceIds]);

  const loadMonth = useCallback(
    async (year: number, monthZeroBased: number) => {
      const key = `${staffId}|${serviceKey}|${year}-${monthZeroBased + 1}`;
      const cached = cacheRef.current.get(key);
      if (cached) {
        setDaysByISO(new Map(cached.map((d) => [d.date, d])));
        setLoading(false);
        setFetchError(null);
        return;
      }

      setLoading(true);
      setFetchError(null);
      try {
        const result = await getMonthAvailabilityAction({
          year,
          month: monthZeroBased + 1,
          serviceIds,
          staffId,
        });

        if (result.error) {
          setFetchError(result.error.message);
          setDaysByISO(new Map());
        } else {
          cacheRef.current.set(key, result.days);
          setDaysByISO(new Map(result.days.map((d) => [d.date, d])));
        }
      } catch (err) {
        console.error('Failed to fetch month availability:', err);
        setFetchError('Erro ao carregar o calendário. Tente novamente.');
        setDaysByISO(new Map());
      } finally {
        setLoading(false);
      }
    },
    [staffId, serviceKey, serviceIds],
  );

  // Fetch ao montar e sempre que mes/staff/servicos mudam
  useEffect(() => {
    if (serviceIds.length === 0) return;
    void loadMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth, loadMonth, serviceIds.length]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    const newDate = new Date(viewYear, viewMonth - 1, 1);
    if (newDate < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const goToNextMonth = () => {
    const newDate = new Date(viewYear, viewMonth + 1, 1);
    if (newDate > maxDate) return;
    setViewMonth(newDate.getMonth());
    setViewYear(newDate.getFullYear());
  };

  const canGoPrev = viewMonth > today.getMonth() || viewYear > today.getFullYear();
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  return (
    <div>
      {/* Header com setas + nome do mes */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-chi-charcoal font-serif text-xl">Escolha a data</h3>

        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            disabled={!canGoPrev}
            aria-label="Mês anterior"
            className={cn(
              'rounded-md p-2 transition-colors',
              canGoPrev
                ? 'text-chi-charcoal hover:bg-chi-sand/50 hover:text-chi-green-deep'
                : 'text-chi-charcoal-light/40 cursor-not-allowed',
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="10 4 6 8 10 12" />
            </svg>
          </button>

          <span className="text-chi-charcoal min-w-[160px] text-center font-serif text-base md:min-w-[180px] md:text-lg">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>

          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            aria-label="Mês seguinte"
            className={cn(
              'rounded-md p-2 transition-colors',
              canGoNext
                ? 'text-chi-charcoal hover:bg-chi-sand/50 hover:text-chi-green-deep'
                : 'text-chi-charcoal-light/40 cursor-not-allowed',
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 4 10 8 6 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grelha */}
      <div
        className={cn(
          'border-chi-border bg-chi-cream relative rounded-lg border p-4 transition-opacity md:p-5',
          loading && 'pointer-events-none opacity-60',
        )}
        aria-busy={loading}
      >
        {/* Cabecalho dos dias da semana */}
        <div className="mb-2 grid grid-cols-7 gap-1 md:gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-chi-charcoal-light py-2 text-center text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grelha dos dias */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {grid.map((date, idx) => {
            const iso = toISO(date);
            const isCurrentMonth = date.getMonth() === viewMonth;
            const isSelected = iso === selectedDate;

            // Dias de preenchimento (outro mes): mudos, nao clicaveis
            if (!isCurrentMonth) {
              return (
                <div
                  key={`${iso}-${idx}`}
                  aria-hidden
                  className="text-chi-charcoal-light/20 flex aspect-square items-center justify-center text-sm md:text-base"
                >
                  {date.getDate()}
                </div>
              );
            }

            const dayInfo = daysByISO.get(iso);
            const state = dayInfo?.state ?? 'out-of-range';

            const isPast = state === 'past';
            const isFull = state === 'full';
            const isUnavailable =
              state === 'closed' || state === 'staff-off' || state === 'out-of-range';
            const isAvailable = state === 'available';
            const isToday = iso === toISO(today);

            const tooltip = dayInfo?.reason ?? STATE_TOOLTIP[state];

            return (
              <button
                key={`${iso}-${idx}`}
                onClick={() => isAvailable && onSelectDate(iso)}
                disabled={!isAvailable}
                title={isAvailable ? undefined : tooltip}
                aria-label={`${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}${
                  isAvailable ? '' : ` — ${tooltip}`
                }`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-sm font-medium transition-all md:text-base',
                  // DISPONIVEL — normal, hover dourado
                  isAvailable &&
                    'text-chi-charcoal hover:bg-chi-gold/15 hover:text-chi-green-deep cursor-pointer',
                  // PASSADO — cor propria (areia), distinta dos indisponiveis
                  isPast && 'text-chi-sand-deep cursor-default',
                  // INDISPONIVEL — opaco (fechado / folga / fora do periodo)
                  isUnavailable && 'text-chi-charcoal cursor-not-allowed opacity-30',
                  // ESGOTADO — riscado (aberto mas sem vagas)
                  isFull && 'text-chi-charcoal-light cursor-not-allowed line-through opacity-60',
                  // HOJE — contorno dourado
                  isToday && !isSelected && 'ring-chi-gold ring-1 ring-inset',
                  // SELECIONADO — tem prioridade sobre tudo
                  isSelected &&
                    '!text-chi-cream shadow-soft !bg-chi-green-deep font-semibold !opacity-100',
                )}
              >
                <span>{date.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Spinner discreto durante fetch */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="border-chi-gold h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Erro de fetch */}
      {fetchError && (
        <div className="mt-3 text-center">
          <p className="text-chi-danger text-sm italic">{fetchError}</p>
          <button
            type="button"
            onClick={() => void loadMonth(viewYear, viewMonth)}
            className="text-chi-gold-deep hover:text-chi-green-deep mt-1 text-xs tracking-[0.15em] uppercase underline underline-offset-4 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Legenda — orientada aos estados reais */}
      <div className="text-chi-charcoal-light mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="border-chi-border bg-chi-cream inline-block h-3 w-3 rounded-sm border" />
          Disponível
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-chi-charcoal/25 inline-block h-3 w-3 rounded-sm" />
          Indisponível
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="line-through">00</span>
          Esgotado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-chi-sand-deep">00</span>
          Passado
        </span>
      </div>
    </div>
  );
}
