'use client';

/**
 * Chi Sublime — Step 2 Client (Orchestrator)
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

  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const [cache, setCache] = useState<Map<string, FetchState>>(new Map());

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

  const handleSelectSlot = (slot: SlotData) => {
    updateState({
      time: slot.time,
      staffId: currentStaffId === 'any' ? 'any' : slot.staffId,
      assignedStaffName: slot.staffName,
    });
  };

  const handleContinue = () => {
    if (date && time) {
      router.push('/reservar/confirmar');
    }
  };

  const handleBack = () => {
    router.push('/reservar');
  };

  const canContinue = Boolean(date && time);

  return (
    <div className="space-y-10 md:space-y-12">
      <StaffPicker staffOptions={staffOptions} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <CalendarPicker selectedDate={date} onSelectDate={handleSelectDate} />
        </div>

        <div>
          <TimeSlotGrid
            state={!date ? 'idle' : fetchState.status === 'error' ? 'loaded' : fetchState.status}
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

      {/* CTAs — Voltar discreto à esquerda, Continuar destacado ao centro */}
      <div className="border-chi-border mt-4 border-t pt-8">
        {/* Helper text quando não pode continuar */}
        {!canContinue && (
          <p className="text-chi-charcoal-light mb-6 text-center text-sm italic">
            {!date
              ? 'Escolha uma data para ver os horários disponíveis.'
              : 'Escolha um horário para continuar.'}
          </p>
        )}

        {/* Linha de botões */}
        <div className="flex items-center justify-between gap-4">
          {/* Voltar — link discreto à esquerda */}
          <button
            type="button"
            onClick={handleBack}
            className="text-chi-charcoal-soft hover:text-chi-charcoal inline-flex items-center gap-2 text-xs font-medium tracking-[0.22em] uppercase transition-colors"
          >
            <span>←</span>
            Voltar
          </button>

          {/* Continuar — botão sólido com largura controlada */}
          {canContinue ? (
            <button
              type="button"
              onClick={handleContinue}
              className="hover:shadow-medium inline-flex items-center justify-center gap-2 px-12 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
            >
              Continuar
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 px-12 py-4 text-xs font-semibold tracking-[0.22em] uppercase opacity-50"
              style={{
                backgroundColor: '#9A9A9A',
                color: '#FAF7F2',
              }}
            >
              Continuar
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
