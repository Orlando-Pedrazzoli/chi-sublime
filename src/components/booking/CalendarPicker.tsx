'use client';

/**
 * Chi Sublime — Calendar Picker (Step 2)
 * ============================================================
 *
 * Calendario mensal para escolha de data.
 *
 * Comportamento:
 *  - Mostra mes atual ou mes navegado pelo user
 *  - Setas para mes anterior/seguinte
 *  - Limite: nao deixa navegar para passado nem para mais de 30 dias futuro
 *  - Dias clicaveis: futuro proximo, dentro de 30 dias
 *  - Dias bloqueados: passado, sabados/domingos, fora do limite
 *  - Hoje destacado com ponto dourado
 *  - Dia selecionado: fundo verde escuro
 *
 * Visual:
 *  - 7 colunas (Seg-Dom) em portugues
 *  - 6 linhas para suportar todos os meses
 *  - Hover dourado em dias clicaveis
 */

import { useMemo, useState } from 'react';
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

type Props = {
  /** Data selecionada (ISO YYYY-MM-DD ou null) */
  selectedDate: string | null;
  /** Callback quando data e selecionada */
  onSelectDate: (isoDate: string) => void;
  /** Maximo de dias futuros permitidos */
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

/** Devolve um array com todos os dias a mostrar no calendario.
 *  Inclui dias de "preenchimento" do mes anterior e seguinte para
 *  formar uma grelha rectangular. Comeca a Segunda. */
function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // JavaScript: 0=Sunday, 1=Monday... Convertemos para Mon=0, Sun=6
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7;

  const days: Date[] = [];

  // Dias do mes anterior (preenchimento)
  for (let i = firstWeekday; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    days.push(d);
  }

  // Dias do mes atual
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Dias do mes seguinte (preenchimento)
  for (let i = 1; i <= 6 - lastWeekday; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// ============================================================
// COMPONENTE
// ============================================================

export function CalendarPicker({ selectedDate, onSelectDate, maxDaysAhead = 30 }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxDaysAhead);
    return d;
  }, [today, maxDaysAhead]);

  // Mes/ano em vista
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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

  // Disable navigation when on edges
  const canGoPrev = viewMonth > today.getMonth() || viewYear > today.getFullYear();

  const canGoNext = (() => {
    const nextMonthFirst = new Date(viewYear, viewMonth + 1, 1);
    return nextMonthFirst <= maxDate;
  })();

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

          <span className="text-chi-charcoal min-w-[180px] text-center font-serif text-base md:text-lg">
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
      <div className="border-chi-border bg-chi-cream rounded-lg border p-4 md:p-5">
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
            const isPast = date < today;
            const isTooFar = date > maxDate;
            const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = iso === toISO(today);
            const isSelected = iso === selectedDate;

            // Bloqueado se: passado, > 30 dias, sabado, domingo, ou fora do mes
            const isBlocked = !isCurrentMonth || isPast || isTooFar || isWeekend;

            return (
              <button
                key={`${iso}-${idx}`}
                onClick={() => !isBlocked && onSelectDate(iso)}
                disabled={isBlocked}
                aria-label={`${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-sm font-medium transition-all md:text-base',
                  // Estados base
                  !isCurrentMonth && 'text-chi-charcoal-light/30',
                  isCurrentMonth &&
                    !isBlocked &&
                    'text-chi-charcoal hover:bg-chi-gold/15 hover:text-chi-green-deep cursor-pointer',
                  isCurrentMonth && isBlocked && 'text-chi-charcoal-light/40 cursor-not-allowed',
                  // Selecionado tem prioridade
                  isSelected && '!bg-chi-green-deep !text-chi-cream shadow-soft font-semibold',
                )}
              >
                <span>{date.getDate()}</span>
                {isToday && !isSelected && (
                  <span className="bg-chi-gold absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda discreta */}
      <p className="text-chi-charcoal-light mt-3 text-center text-[11px] italic">
        Sábados, domingos e feriados não estão disponíveis para reserva.
      </p>
    </div>
  );
}
