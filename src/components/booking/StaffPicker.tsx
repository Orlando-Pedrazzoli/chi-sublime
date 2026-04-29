'use client';

/**
 * Chi Sublime — Staff Picker (Step 2)
 * ============================================================
 *
 * Cards horizontais para o cliente escolher o profissional.
 *
 * Comportamento:
 *  - Primeira opcao: "Qualquer disponivel" (default)
 *  - Cards seguintes: cada staff ativo (Jean Pierre, Matias, Ana Rita)
 *  - Click → atualiza useBookingFlow.staffId
 *  - Cards: foto round + nome + role
 *  - Selecionado: borda dourada + sombra
 *
 * Mobile: scroll horizontal (overflow-x).
 * Desktop: grelha 4 colunas.
 */

import Image from 'next/image';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { cn } from '@/lib/utils/cn';

export type StaffOption = {
  id: string;
  name: string;
  role: string;
  photo?: string;
};

type Props = {
  staffOptions: StaffOption[];
};

export function StaffPicker({ staffOptions }: Props) {
  const { staffId, updateState } = useBookingFlow();

  // Se nao houver staffId definido, default a "any"
  const currentStaffId = staffId ?? 'any';

  const handleSelect = (id: string) => {
    updateState({ staffId: id, date: null, time: null, assignedStaffName: null });
    // (limpa data/hora porque os slots dependem do staff)
  };

  return (
    <div>
      <h3 className="text-chi-charcoal mb-5 font-serif text-xl">Profissional</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        {/* Card "Qualquer disponivel" */}
        <button
          onClick={() => handleSelect('any')}
          className={cn(
            'group bg-chi-cream flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
            currentStaffId === 'any'
              ? 'border-chi-gold shadow-gold'
              : 'border-chi-border hover:border-chi-gold/50 hover:shadow-soft',
          )}
          aria-pressed={currentStaffId === 'any'}
        >
          {/* "Avatar" decorativo */}
          <div
            className={cn(
              'relative flex h-16 w-16 items-center justify-center rounded-full transition-all md:h-20 md:w-20',
              currentStaffId === 'any' ? 'bg-chi-gold' : 'bg-chi-sand group-hover:bg-chi-sand-deep',
            )}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              stroke={currentStaffId === 'any' ? '#1F3D2E' : '#5A5A5A'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="10" r="3.5" />
              <circle cx="19" cy="10" r="3.5" />
              <path d="M3 22c0-3.3 2.7-6 6-6s6 2.7 6 6M13 22c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </svg>
          </div>
          <div className="text-center">
            <p
              className={cn(
                'font-serif text-base leading-tight font-medium',
                currentStaffId === 'any' ? 'text-chi-green-deep' : 'text-chi-charcoal',
              )}
            >
              Qualquer
            </p>
            <p className="text-chi-charcoal-light mt-1 text-[10px] tracking-[0.18em] uppercase">
              disponível
            </p>
          </div>
        </button>

        {/* Cards de staff */}
        {staffOptions.map((staff) => {
          const isSelected = currentStaffId === staff.id;

          return (
            <button
              key={staff.id}
              onClick={() => handleSelect(staff.id)}
              className={cn(
                'group bg-chi-cream flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                isSelected
                  ? 'border-chi-gold shadow-gold'
                  : 'border-chi-border hover:border-chi-gold/50 hover:shadow-soft',
              )}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  'bg-chi-sand relative h-16 w-16 overflow-hidden rounded-full transition-all md:h-20 md:w-20',
                  isSelected && 'ring-chi-gold ring-offset-chi-cream ring-2 ring-offset-2',
                )}
              >
                {staff.photo ? (
                  <Image
                    src={staff.photo}
                    alt={staff.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="text-chi-charcoal-light flex h-full w-full items-center justify-center font-serif text-2xl">
                    {staff.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'font-serif text-base leading-tight font-medium',
                    isSelected ? 'text-chi-green-deep' : 'text-chi-charcoal',
                  )}
                >
                  {staff.name}
                </p>
                <p className="text-chi-charcoal-light mt-1 line-clamp-1 text-[10px] tracking-[0.18em] uppercase">
                  {staff.role}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
