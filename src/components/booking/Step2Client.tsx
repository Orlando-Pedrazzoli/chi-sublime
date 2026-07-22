// 📄 src/components/booking/Step2Client.tsx
'use client';

/**
 * Chi Sublime — Step 2 Client (Orchestrator)
 * ============================================================
 *
 * MUDANCAS (auditoria):
 *  - CalendarPicker agora recebe serviceIds + staffId e pinta
 *    os estados de cada dia via getMonthAvailabilityAction
 *    (passado / fechado / folga / esgotado / disponivel).
 *  - TimeSlotGrid so mostra o nome do staff quando o cliente
 *    escolheu "qualquer profissional".
 *  - CTAs empilham confortavelmente no mobile.
 *
 * ⚠️ FIX botões "espremidos" (bug Tailwind v4 + Next 16): as
 * classes de PADDING (py-3.5/py-4) estavam a ser ignoradas em
 * produção. Padding, border-radius (8px) e cores dos CTAs
 * passaram para INLINE STYLE — regra do projeto.
 */

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { getAvailableSlotsAction } from '@/lib/server-actions/bookings';
import { StaffPicker, type StaffOption } from './StaffPicker';
import { CalendarPicker } from './CalendarPicker';
import { TimeSlotGrid, type SlotData } from './TimeSlotGrid';

/* Estilos críticos dos CTAs — sempre inline */
const CTA_PRIMARY: React.CSSProperties = {
  backgroundColor: '#1F3D2E',
  color: '#FAF7F2',
  padding: '15px 32px',
  borderRadius: '8px',
};

const CTA_DISABLED: React.CSSProperties = {
  backgroundColor: '#9A9A9A',
  color: '#FAF7F2',
  padding: '15px 32px',
  borderRadius: '8px',
};

const CTA_CONFIRM: React.CSSProperties = {
  backgroundColor: '#1F3D2E',
  color: '#FAF7F2',
  padding: '14px 24px',
  borderRadius: '8px',
};

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
  const t = useTranslations('booking.step2');
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { selectedServiceIds, staffId, date, time, assignedStaffName, updateState } =
    useBookingFlow();

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
          errorMessage: t('slotsError'),
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
          <CalendarPicker
            selectedDate={date}
            onSelectDate={handleSelectDate}
            serviceIds={selectedServiceIds}
            staffId={currentStaffId}
          />
        </div>

        <div>
          <TimeSlotGrid
            state={!date ? 'idle' : fetchState.status === 'error' ? 'loaded' : fetchState.status}
            slots={fetchState.slots}
            closedDetail={fetchState.closedDetail}
            selectedTime={time}
            onSelectSlot={handleSelectSlot}
            showStaffName={currentStaffId === 'any'}
          />

          {fetchState.status === 'error' && (
            <p className="text-chi-danger mt-3 text-center text-sm italic">
              {fetchState.errorMessage}
            </p>
          )}

          {/* Confirmação contextual — aparece colada ao horário escolhido */}
          {canContinue && date && time && (
            <div
              className="mt-5 border p-5"
              style={{
                borderColor: 'rgba(212,175,110,0.5)',
                backgroundColor: 'rgba(212,175,110,0.08)',
                borderRadius: '10px',
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.25em] uppercase"
                style={{ color: '#B8924A' }}
              >
                {t('yourChoice')}
              </p>
              <p className="mt-1.5 font-serif text-lg capitalize" style={{ color: '#1A1A1A' }}>
                {new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }).format(new Date(`${date}T12:00:00`))}
                {' · '}
                <span style={{ color: '#1F3D2E' }}>{time}</span>
              </p>
              {assignedStaffName && (
                <p className="mt-0.5 text-sm" style={{ color: '#5A5A5A' }}>
                  {t('withStaff', { name: assignedStaffName })}
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] hover:opacity-95"
                style={CTA_CONFIRM}
              >
                {t('confirmSlot')}
                <span>→</span>
              </button>
              <p className="mt-2.5 text-center text-xs italic" style={{ color: '#8A8A8A' }}>
                {t('changeHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTAs — Voltar discreto à esquerda, Continuar destacado à direita */}
      <div className="border-chi-border mt-4 border-t pt-8">
        {/* Helper text quando não pode continuar */}
        {!canContinue && (
          <p className="mb-6 text-center text-sm italic" style={{ color: '#8A8A8A' }}>
            {!date ? t('chooseDateHint') : t('chooseTimeHint')}
          </p>
        )}

        {/* Linha de botões */}
        <div className="flex items-center justify-between gap-4">
          {/* Voltar — link discreto à esquerda (cor inline por segurança) */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex shrink-0 items-center gap-2 text-xs font-medium tracking-[0.22em] uppercase transition-colors hover:opacity-70"
            style={{ color: '#5A5A5A', padding: '8px 0' }}
          >
            <span>←</span>
            {t('back')}
          </button>

          {/* Continuar — padding, radius e cores SEMPRE inline */}
          {canContinue ? (
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex flex-1 items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] hover:opacity-95 sm:flex-none"
              style={CTA_PRIMARY}
            >
              {t('continue')}
              <span>→</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase opacity-50 sm:flex-none"
              style={CTA_DISABLED}
            >
              {t('continue')}
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
