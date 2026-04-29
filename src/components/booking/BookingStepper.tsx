'use client';

/**
 * Chi Sublime — Booking Stepper
 * ============================================================
 *
 * Indicador visual dos 3 passos do fluxo de reserva.
 *
 * Visual:
 *  - 3 circulos numerados conectados por linhas
 *  - Passo atual: dourado (preenchido)
 *  - Passos completos: verde escuro (com ✓)
 *  - Passos pendentes: cinza (vazio)
 */

import { cn } from '@/lib/utils/cn';

export type BookingStep = 'service' | 'time' | 'confirm';

const STEPS: { key: BookingStep; label: string; number: number }[] = [
  { key: 'service', label: 'Servico', number: 1 },
  { key: 'time', label: 'Horario', number: 2 },
  { key: 'confirm', label: 'Confirmar', number: 3 },
];

const STEP_ORDER: Record<BookingStep, number> = {
  service: 1,
  time: 2,
  confirm: 3,
};

type Props = {
  currentStep: BookingStep;
};

export function BookingStepper({ currentStep }: Props) {
  const currentNum = STEP_ORDER[currentStep];

  return (
    <nav aria-label="Progresso da reserva" className="mx-auto max-w-2xl">
      <ol className="flex items-center justify-between gap-2 md:gap-4">
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentNum;
          const isActive = step.number === currentNum;
          const isPending = step.number > currentNum;
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step.key} className={cn('flex items-center', !isLast && 'flex-1')}>
              {/* Circulo numerado */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-12 md:w-12',
                    isActive && 'border-chi-gold bg-chi-gold text-chi-green-deep shadow-gold',
                    isCompleted && 'border-chi-green-deep bg-chi-green-deep text-chi-cream',
                    isPending &&
                      'border-chi-charcoal-light/30 text-chi-charcoal-light bg-transparent',
                  )}
                >
                  {isCompleted ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="4 11 8 15 16 6" />
                    </svg>
                  ) : (
                    <span className="font-serif text-lg font-medium md:text-xl">{step.number}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] tracking-[0.2em] uppercase transition-colors md:text-xs',
                    isActive && 'text-chi-green-deep font-semibold',
                    isCompleted && 'text-chi-charcoal-soft',
                    isPending && 'text-chi-charcoal-light',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Linha conectora (exceto no ultimo) */}
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 mt-[-20px] h-px flex-1 transition-colors duration-300 md:mx-4',
                    isCompleted ? 'bg-chi-green-deep' : 'bg-chi-charcoal-light/30',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
