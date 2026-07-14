// 📄 src/components/booking/TimeSlotGrid.tsx
'use client';

/**
 * Chi Sublime — Time Slot Grid (Step 2)
 * ============================================================
 *
 * Grelha de horarios disponiveis para a data escolhida.
 *
 * Melhorias mobile-first (best practices de booking):
 *  - Slots agrupados por MANHA / TARDE (scan mais rapido)
 *  - Touch targets >= 52px de altura
 *  - Nome do staff so aparece quando o cliente escolheu
 *    "qualquer profissional" (showStaffName) — senao e redundante
 *
 * Estados:
 *  - Idle (sem data escolhida): mensagem inicial
 *  - Loading: skeleton durante fetch
 *  - Empty: mensagem amigavel ("sem horarios disponiveis")
 *  - Closed: mensagem do salao fechado (feriado, etc.)
 *  - Loaded: grelha de slots clicaveis
 */

import { cn } from '@/lib/utils/cn';

export type SlotData = {
  time: string; // "HH:MM"
  staffId: string;
  staffName: string;
};

type Props = {
  /** Estado do fetch */
  state: 'idle' | 'loading' | 'loaded' | 'closed';
  /** Slots disponiveis (so usado quando state === 'loaded') */
  slots?: SlotData[];
  /** Mensagem do salao fechado (closed reason) */
  closedDetail?: string;
  /** Slot selecionado pelo user */
  selectedTime: string | null;
  /** Callback quando user escolhe um slot */
  onSelectSlot: (slot: SlotData) => void;
  /** Mostrar o nome do staff em cada slot (true quando staff='any') */
  showStaffName?: boolean;
};

function isMorning(time: string): boolean {
  return Number(time.slice(0, 2)) < 12;
}

export function TimeSlotGrid({
  state,
  slots = [],
  closedDetail,
  selectedTime,
  onSelectSlot,
  showStaffName = true,
}: Props) {
  const morning = slots.filter((s) => isMorning(s.time));
  const afternoon = slots.filter((s) => !isMorning(s.time));

  const renderSlots = (group: SlotData[]) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3">
      {group.map((slot) => {
        const isSelected = selectedTime === slot.time;
        return (
          <button
            key={`${slot.time}-${slot.staffId}`}
            onClick={() => onSelectSlot(slot)}
            aria-pressed={isSelected}
            className={cn(
              'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border-2 px-2 py-3 transition-all duration-200',
              isSelected
                ? 'border-chi-gold bg-chi-gold shadow-gold'
                : 'border-chi-border bg-chi-cream hover:border-chi-gold hover:shadow-soft',
            )}
          >
            <span
              className={cn(
                'font-mono text-base font-medium md:text-lg',
                isSelected ? 'text-chi-green-deep' : 'text-chi-charcoal',
              )}
            >
              {slot.time}
            </span>
            {showStaffName && (
              <span
                className={cn(
                  'max-w-full truncate text-[10px] tracking-[0.12em] uppercase',
                  isSelected ? 'text-chi-green-darker' : 'text-chi-charcoal-light',
                )}
              >
                {slot.staffName}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <h3 className="text-chi-charcoal mb-5 font-serif text-xl">Horários disponíveis</h3>

      {/* IDLE — sem data escolhida ainda */}
      {state === 'idle' && (
        <div className="border-chi-border bg-chi-cream/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-chi-charcoal-soft font-serif italic">
            Selecione uma data no calendário para ver os horários disponíveis.
          </p>
        </div>
      )}

      {/* LOADING — skeleton */}
      {state === 'loading' && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3" aria-busy="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-chi-sand/40 h-[52px] animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {/* CLOSED — salao fechado */}
      {state === 'closed' && (
        <div className="border-chi-border bg-chi-cream rounded-lg border p-8 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-chi-gold-deep mx-auto mb-3"
          >
            <circle cx="16" cy="16" r="13" />
            <path d="M16 9v8M16 22h.01" />
          </svg>
          <p className="text-chi-charcoal font-serif text-lg italic">
            {closedDetail || 'Salão fechado nesta data'}
          </p>
          <p className="text-chi-charcoal-soft mt-2 text-sm">Por favor escolha outra data.</p>
        </div>
      )}

      {/* LOADED VAZIO — sem slots */}
      {state === 'loaded' && slots.length === 0 && (
        <div className="border-chi-border bg-chi-cream rounded-lg border p-8 text-center">
          <p className="text-chi-charcoal mb-1 font-serif text-lg italic">
            Sem horários disponíveis nesta data
          </p>
          <p className="text-chi-charcoal-soft text-sm">Tente outro dia ou outro profissional.</p>
        </div>
      )}

      {/* LOADED — slots agrupados por periodo */}
      {state === 'loaded' && slots.length > 0 && (
        <div className="space-y-6">
          {morning.length > 0 && (
            <div>
              <p className="text-chi-charcoal-light mb-3 text-[10px] font-semibold tracking-[0.25em] uppercase">
                Manhã
              </p>
              {renderSlots(morning)}
            </div>
          )}
          {afternoon.length > 0 && (
            <div>
              <p className="text-chi-charcoal-light mb-3 text-[10px] font-semibold tracking-[0.25em] uppercase">
                Tarde
              </p>
              {renderSlots(afternoon)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
