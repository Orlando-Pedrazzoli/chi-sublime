// 📄 src/components/booking/StaffPicker.tsx
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
 * ELEGIBILIDADE (set. 2026):
 *  Um profissional que NÃO faz (pelo menos) um dos serviços do
 *  carrinho aparece DESATIVADO COM EXPLICAÇÃO — cinzento, badge
 *  "Não faz este serviço" — e o clique NÃO o seleciona: chama
 *  `onBlockedSelect`, que mostra o aviso no Step2Client. Antes, o
 *  cliente selecionava-o, o calendário ficava sem datas e ninguém
 *  lhe dizia porquê.
 *  (Padrão Nielsen: desativar + explicar > esconder; os líderes do
 *  setor — Fresha, Booksy, Vagaro — filtram a lista por serviço.)
 *
 * Mobile: grelha 2 colunas. Desktop: grelha 4 colunas.
 */

import Image from 'next/image';
import { useTranslations } from 'next-intl';
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
  /** Staff efetivamente selecionado ('any' quando o guardado deixou de ser elegível) */
  selectedStaffId: string;
  /** IDs dos profissionais que fazem TODOS os serviços do carrinho */
  qualifiedStaffIds: string[];
  /** Chamado quando o cliente toca num profissional não elegível */
  onBlockedSelect: (staff: StaffOption) => void;
};

export function StaffPicker({
  staffOptions,
  selectedStaffId,
  qualifiedStaffIds,
  onBlockedSelect,
}: Props) {
  const t = useTranslations('booking.eligibility');
  const { updateState } = useBookingFlow();

  // O selecionado vem do orquestrador (já com fallback a "any")
  const currentStaffId = selectedStaffId;

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
          const isEligible = qualifiedStaffIds.includes(staff.id);

          return (
            <button
              key={staff.id}
              onClick={() => (isEligible ? handleSelect(staff.id) : onBlockedSelect(staff))}
              className={cn(
                'group bg-chi-cream relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                isSelected
                  ? 'border-chi-gold shadow-gold'
                  : isEligible
                    ? 'border-chi-border hover:border-chi-gold/50 hover:shadow-soft'
                    : 'border-chi-border cursor-not-allowed',
              )}
              // Cor/opacidade críticas em inline style (regra do projeto)
              style={!isEligible ? { opacity: 0.55, backgroundColor: '#F3EFE8' } : undefined}
              aria-pressed={isSelected}
              aria-disabled={!isEligible || undefined}
              title={!isEligible ? t('staffNotEligibleBadge') : undefined}
            >
              <div
                className={cn(
                  'bg-chi-sand relative h-16 w-16 overflow-hidden rounded-full transition-all md:h-20 md:w-20',
                  isSelected && 'ring-chi-gold ring-offset-chi-cream ring-2 ring-offset-2',
                  !isEligible && 'grayscale',
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
                {isEligible ? (
                  <p className="text-chi-charcoal-light mt-1 line-clamp-1 text-[10px] tracking-[0.18em] uppercase">
                    {staff.role}
                  </p>
                ) : (
                  <p
                    className="mt-1 line-clamp-2 text-[10px] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: '#8A6D3B' }}
                  >
                    {t('staffNotEligibleBadge')}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
