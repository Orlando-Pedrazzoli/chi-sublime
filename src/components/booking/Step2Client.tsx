'use client';

/**
 * Chi Sublime — Step 2 Client (Orchestrator)
 * ============================================================
 *
 * Componente cliente que orquestra:
 *  - StaffPicker (escolher profissional)
 *  - CalendarPicker (escolher data)
 *  - TimeSlotGrid (escolher hora)
 *
 * Estado:
 *  - useBookingFlow: staffId, date, time (persiste em sessionStorage)
 *  - Local: slots cache (Map de date → slots[])
 *  - Local: loading state durante fetch
 *
 * Fluxo:
 *  1. User escolhe staff → reset date/time
 *  2. User escolhe data → fetch slots
 *  3. User escolhe slot → grava staffId atribuido + time
 *  4. Botao "Continuar" fica ativo → /reservar/confirmar
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { getAvailableSlotsAction } from '@/lib/server-actions/bookings';
import { StaffPicker, type StaffOption } from './StaffPicker';
import { CalendarPicker } from './CalendarPicker';
import { TimeSlotGrid, type SlotData } from './TimeSlotGrid';

type FetchState = {
  status: 'idle' | 'loading' | 'loaded' | 'closed' | 'error';
  slots?: SlotData[];
  closedDetail?: string;
  errorMessage?: string;
};

type Props = {
  staffOptions: StaffOption[];
};

export function Step2Client({ staffOptions }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { selectedServiceIds, staffId, date, time, updateState } = useBookingFlow();

  const currentStaffId = staffId ?? 'any';

  // Estado de fetch (slots para a data atualmente selecionada)
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  // Cache de slots: chave "{staffId}:{date}" → resultado
  const [cache, setCache] = useState<Map<string, FetchState>>(new Map());

  // ============================================================
  // HANDLERS
  // ============================================================

  /** Quando user escolhe data: limpar time anterior e fazer fetch */
  const handleSelectDate = (isoDate: string) => {
    updateState({ date: isoDate, time: null, assignedStaffName: null });

    const cacheKey = `${currentStaffId}:${isoDate}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setFetchState(cached);
      return;
    }

    setFetchState({ status: 'loading' });

    startTransition(async () => {
      try {
        const result = await getAvailableSlotsAction({
          date: isoDate,
          serviceIds: selectedServiceIds,
          staffId: currentStaffId,
        });

        if (result.error) {
          const newState: FetchState = {
            status: 'error',
            errorMessage: result.error.message,
          };
          setFetchState(newState);
          setCache((prev) => new Map(prev).set(cacheKey, newState));
          return;
        }

        if (!result.metadata.salonOpen) {
          const newState: FetchState = {
            status: 'closed',
            closedDetail: result.metadata.closedReasonDetail,
          };
          setFetchState(newState);
          setCache((prev) => new Map(prev).set(cacheKey, newState));
          return;
        }

        const newState: FetchState = {
          status: 'loaded',
          slots: result.slots.map((s) => ({
            time: s.time,
            staffId: s.staffId,
            staffName: s.staffName,
          })),
        };
        setFetchState(newState);
        setCache((prev) => new Map(prev).set(cacheKey, newState));
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setFetchState({
          status: 'error',
          errorMessage: 'Erro ao carregar horários. Tente novamente.',
        });
      }
    });
  };

  /** Quando user escolhe slot */
  const handleSelectSlot = (slot: SlotData) => {
    updateState({
      time: slot.time,
      // Atualiza staffId concreto se "any" foi escolhido
      staffId: currentStaffId === 'any' ? 'any' : slot.staffId,
      assignedStaffName: slot.staffName,
    });
  };

  /** CTA "Continuar" → vai para Step 3 */
  const handleContinue = () => {
    if (date && time) {
      router.push('/reservar/confirmar');
    }
  };

  /** Botao "Voltar" → Step 1 */
  const handleBack = () => {
    router.push('/reservar');
  };

  const canContinue = Boolean(date && time);

  // ============================================================
  // RENDER
  // ============================================================

  // Quando staff muda, fetchState volta a idle (ou usa cache)
  // Isto e tratado pelo useEffect implicit ao re-renderizar quando staffId muda
  // (cada staff tem cache key diferente)

  return (
    <div className="space-y-10 md:space-y-12">
      {/* STAFF PICKER */}
      <StaffPicker staffOptions={staffOptions} />

      {/* CALENDAR + TIME SLOTS */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <CalendarPicker selectedDate={date} onSelectDate={handleSelectDate} />
        </div>

        <div>
          <TimeSlotGrid
            state={
              !date
                ? 'idle'
                : fetchState.status === 'error'
                  ? 'loaded' // mostra empty state com erro
                  : fetchState.status
            }
            slots={fetchState.slots}
            closedDetail={fetchState.closedDetail}
            selectedTime={time}
            onSelectSlot={handleSelectSlot}
          />

          {fetchState.status === 'error' && (
            <p className="text-chi-danger mt-3 text-center text-sm italic">
              {fetchState.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className="border-chi-border flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:gap-4">
        <button
          onClick={handleBack}
          className="text-chi-charcoal-soft border-chi-border hover:bg-chi-sand/40 hover:text-chi-charcoal inline-flex items-center justify-center gap-2 rounded-md border px-6 py-3.5 text-xs font-medium tracking-[0.22em] uppercase transition-colors sm:flex-none"
        >
          <span>←</span>
          Voltar
        </button>

        {canContinue ? (
          <button
            onClick={handleContinue}
            className="bg-chi-green-deep hover:bg-chi-green-soft hover:shadow-medium inline-flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
            style={{ color: '#FAF7F2' }}
          >
            Continuar
            <span>→</span>
          </button>
        ) : (
          <button
            disabled
            className="bg-chi-charcoal-light/40 inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase"
            style={{ color: '#FAF7F2' }}
          >
            Continuar
          </button>
        )}
      </div>

      {!canContinue && (
        <p className="text-chi-charcoal-light -mt-4 text-center text-sm italic">
          {!date
            ? 'Escolha uma data para ver os horários disponíveis.'
            : 'Escolha um horário para continuar.'}
        </p>
      )}
    </div>
  );
}
