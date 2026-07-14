// 📄 src/components/booking/BookingStepper.tsx
'use client';

/**
 * Chi Sublime — Booking Stepper
 * ============================================================
 *
 * Indicador visual dos 3 passos do fluxo de reserva.
 *
 * MUDANCAS (auditoria):
 *  - Mais compacto no mobile (circulos 36px vs 40px, menos
 *    altura total — mais conteudo util above the fold)
 *  - Linhas conectoras por posicionamento absoluto atras dos
 *    circulos (remove o hack mt-[-20px], alinhamento perfeito
 *    em qualquer breakpoint)
 *
 * Visual:
 *  - Passo atual: dourado (preenchido)
 *  - Passos completos: verde escuro (com check)
 *  - Passos pendentes: contorno cinza
 */

import { cn } from '@/lib/utils/cn';

export type BookingStep = 'service' | 'time' | 'confirm';

const STEPS: { key: BookingStep; label: string; number: number }[] = [
  { key: 'service', label: 'Serviço', number: 1 },
  { key: 'time', label: 'Horário', number: 2 },
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
      <div className="relative">
        {/* Linhas conectoras — absolutas, atrás dos círculos.
            Centros dos círculos: 16.67% / 50% / 83.33% da largura.
            top = metade da altura do círculo (36px mobile, 44px md). */}
        <div
          className={cn(
            'absolute left-[16.67%] h-px w-[33.33%] transition-colors duration-300',
            'top-[18px] md:top-[22px]',
            currentNum > 1 ? 'bg-chi-green-deep' : 'bg-chi-charcoal-light/30',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'absolute left-1/2 h-px w-[33.33%] transition-colors duration-300',
            'top-[18px] md:top-[22px]',
            currentNum > 2 ? 'bg-chi-green-deep' : 'bg-chi-charcoal-light/30',
          )}
          aria-hidden
        />

        <ol className="relative grid grid-cols-3">
          {STEPS.map((step) => {
            const isCompleted = step.number < currentNum;
            const isActive = step.number === currentNum;
            const isPending = step.number > currentNum;

            return (
              <li key={step.key} className="flex flex-col items-center gap-2">
                {/* Círculo (bg opaco para cobrir a linha) */}
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-11 md:w-11',
                    isActive && 'border-chi-gold bg-chi-gold text-chi-green-deep shadow-gold',
                    isCompleted && 'border-chi-green-deep bg-chi-green-deep text-chi-cream',
                    isPending &&
                      'border-chi-charcoal-light/30 text-chi-charcoal-light bg-chi-cream',
                  )}
                >
                  {isCompleted ? (
                    <svg
                      width="16"
                      height="16"
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
                    <span className="font-serif text-base font-medium md:text-lg">
                      {step.number}
                    </span>
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
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
