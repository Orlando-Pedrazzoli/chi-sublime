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
 *
 * ELEGIBILIDADE (set. 2026):
 *  - Recebe `serviceEligibility` (serviço → staffIds) e calcula no
 *    browser quem faz TODOS os serviços do carrinho.
 *  - StaffPicker desativa (com explicação) quem não é elegível; o
 *    toque num não elegível mostra um aviso aqui (role="alert").
 *  - Se o staff guardado no sessionStorage deixou de ser elegível
 *    (o cliente voltou atrás e mudou os serviços), repõe "Qualquer
 *    disponível" e avisa — nunca deixa o calendário vazio sem dizer
 *    porquê.
 *  - Carrinho sem NENHUM profissional em comum (ex.: serviço A só X,
 *    serviço B só Y): painel explicativo com CTA para voltar aos
 *    serviços, em vez de um calendário sem datas.
 */

import { useMemo, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { getAvailableSlotsAction } from '@/lib/server-actions/bookings';
import {
  getQualifiedStaffIds,
  getServicesStaffCannotPerform,
  joinNames,
} from '@/lib/booking/eligibility';
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

type FetchState = {
  status: 'idle' | 'loading' | 'loaded' | 'closed' | 'error';
  slots?: SlotData[];
  closedDetail?: string;
  errorMessage?: string;
};

type Props = {
  staffOptions: StaffOption[];
  /** serviço → IDs dos profissionais que o fazem (vazio = qualquer um) */
  serviceEligibility: Record<string, string[]>;
};

export function Step2Client({ staffOptions, serviceEligibility }: Props) {
  const t = useTranslations('booking.step2');
  const te = useTranslations('booking.eligibility');
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const {
    selectedServices,
    selectedServiceIds,
    staffId,
    date,
    time,
    assignedStaffName,
    updateState,
  } = useBookingFlow();

  const currentStaffId = staffId ?? 'any';

  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const [cache, setCache] = useState<Map<string, FetchState>>(new Map());

  // ------------------------------------------------------------
  // Elegibilidade (calculada no browser, sem round-trip)
  // ------------------------------------------------------------
  const cartServices = useMemo(
    () =>
      selectedServices.map((s) => ({
        id: s.id,
        name: s.name,
        staffIds: serviceEligibility[s.id] ?? [],
      })),
    [selectedServices, serviceEligibility],
  );

  const qualifiedStaffIds = useMemo(
    () => getQualifiedStaffIds(cartServices, staffOptions),
    [cartServices, staffOptions],
  );

  /** Ninguém faz o carrinho inteiro (ex.: A só X + B só Y) */
  const noOneQualified = cartServices.length > 0 && qualifiedStaffIds.length === 0;

  /**
   * Aviso de elegibilidade (toque num profissional não elegível ou
   * reposição automática). Fica ligado ao staff selecionado no momento
   * em que foi mostrado: assim que o cliente escolhe outro profissional
   * o aviso desaparece sozinho — sem efeitos extra.
   */
  const [notice, setNotice] = useState<{ text: string; forStaffId: string } | null>(null);
  const clickNotice = notice && notice.forStaffId === currentStaffId ? notice.text : null;

  const describeBlockedStaff = (staff: StaffOption): string => {
    const missing = getServicesStaffCannotPerform(staff.id, cartServices).map((s) => `«${s.name}»`);
    return te('staffNotEligible', {
      name: staff.name,
      services: joinNames(missing, te('and')),
      count: missing.length,
    });
  };

  const handleBlockedSelect = (staff: StaffOption) => {
    setNotice({ text: describeBlockedStaff(staff), forStaffId: currentStaffId });
  };

  // Staff guardado (sessionStorage) deixou de ser elegível — acontece
  // quando o cliente escolhe um profissional, volta ao passo 1 e
  // acrescenta um serviço que esse profissional não faz. Em vez de um
  // efeito com setState (cascading renders), DERIVAMOS o estado efetivo
  // durante o render: tratamos como "Qualquer disponível", ignoramos a
  // data/hora antigas e mostramos o aviso. O sessionStorage é
  // normalizado na próxima interação (escolher data ou profissional).
  const storedStaff =
    currentStaffId !== 'any' ? (staffOptions.find((s) => s.id === currentStaffId) ?? null) : null;
  // Stale = já não é elegível OU já não existe/está inativo (sem aviso neste caso)
  const staffIsStale =
    currentStaffId !== 'any' &&
    !noOneQualified &&
    (storedStaff === null || !qualifiedStaffIds.includes(currentStaffId));
  const staleStaff = staffIsStale ? storedStaff : null;
  const effectiveStaffId = staffIsStale ? 'any' : currentStaffId;
  const effectiveDate = staffIsStale ? null : date;
  const effectiveTime = staffIsStale ? null : time;

  const [staleNoticeDismissed, setStaleNoticeDismissed] = useState(false);
  const staleNotice =
    staleStaff && !staleNoticeDismissed
      ? `${describeBlockedStaff(staleStaff)} ${te('resetToAny')}`
      : null;
  const eligibilityNotice = staleNotice ?? clickNotice;

  const handleSelectDate = (isoDate: string) => {
    // staffId incluído de propósito: normaliza um staff "stale" para 'any'
    updateState({ staffId: effectiveStaffId, date: isoDate, time: null, assignedStaffName: null });

    const cacheKey = `${effectiveStaffId}:${isoDate}`;
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
          staffId: effectiveStaffId,
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
      staffId: effectiveStaffId === 'any' ? 'any' : slot.staffId,
      assignedStaffName: slot.staffName,
    });
  };

  const handleContinue = () => {
    if (effectiveDate && effectiveTime) {
      router.push('/marcacoes/confirmar');
    }
  };

  const handleBack = () => {
    router.push('/marcacoes');
  };

  const canContinue = Boolean(effectiveDate && effectiveTime);

  // ------------------------------------------------------------
  // Beco sem saída: nenhum profissional faz todos os serviços.
  // Explica QUEM faz o quê e devolve o cliente ao passo 1.
  // ------------------------------------------------------------
  if (noOneQualified) {
    const lines = cartServices.map((svc) => {
      const names = staffOptions
        .filter((s) => svc.staffIds.length === 0 || svc.staffIds.includes(s.id))
        .map((s) => s.name);
      return { id: svc.id, name: svc.name, staff: joinNames(names, te('and')) };
    });

    return (
      <div
        role="alert"
        className="mx-auto max-w-2xl border p-6 md:p-8"
        style={{
          borderColor: 'rgba(212,175,110,0.6)',
          backgroundColor: 'rgba(212,175,110,0.08)',
          borderRadius: '12px',
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.25em] uppercase"
          style={{ color: '#B8924A' }}
        >
          {te('noCommonStaffKicker')}
        </p>
        <h2 className="mt-2 font-serif text-2xl" style={{ color: '#1A1A1A' }}>
          {te('noCommonStaffTitle')}
        </h2>
        <p className="mt-3 text-sm leading-[1.7]" style={{ color: '#3D3D3D' }}>
          {te('noCommonStaffBody')}
        </p>

        <ul className="mt-5 space-y-2 text-sm" style={{ color: '#1A1A1A' }}>
          {lines.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-serif text-base">«{l.name}»</span>
              <span style={{ color: '#5A5A5A' }}>— {te('performedBy', { staff: l.staff })}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm leading-[1.7]" style={{ color: '#3D3D3D' }}>
          {te('noCommonStaffHint')}
        </p>

        <button
          type="button"
          onClick={handleBack}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] hover:opacity-95 sm:w-auto"
          style={CTA_PRIMARY}
        >
          <span>←</span>
          {te('backToServices')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-12">
      <div>
        <StaffPicker
          staffOptions={staffOptions}
          selectedStaffId={effectiveStaffId}
          qualifiedStaffIds={qualifiedStaffIds}
          onBlockedSelect={handleBlockedSelect}
        />

        {/* Aviso de elegibilidade — colado ao picker, anunciado a leitores de ecrã */}
        {eligibilityNotice && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 border text-sm leading-[1.6]"
            style={{
              padding: '14px 18px',
              borderColor: 'rgba(212,175,110,0.6)',
              backgroundColor: 'rgba(212,175,110,0.10)',
              borderRadius: '10px',
              color: '#3D3D3D',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B8924A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="flex-1">{eligibilityNotice}</p>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setStaleNoticeDismissed(true);
              }}
              className="shrink-0 text-lg leading-none hover:opacity-70"
              style={{ color: '#8A8A8A' }}
              aria-label={te('dismiss')}
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <CalendarPicker
            selectedDate={effectiveDate}
            onSelectDate={handleSelectDate}
            serviceIds={selectedServiceIds}
            staffId={effectiveStaffId}
          />
        </div>

        <div>
          <TimeSlotGrid
            state={
              !effectiveDate ? 'idle' : fetchState.status === 'error' ? 'loaded' : fetchState.status
            }
            slots={fetchState.slots}
            closedDetail={fetchState.closedDetail}
            selectedTime={effectiveTime}
            onSelectSlot={handleSelectSlot}
            showStaffName={effectiveStaffId === 'any'}
          />

          {fetchState.status === 'error' && (
            <p className="text-chi-danger mt-3 text-center text-sm italic">
              {fetchState.errorMessage}
            </p>
          )}

          {/* Confirmação contextual — aparece colada ao horário escolhido */}
          {canContinue && effectiveDate && effectiveTime && (
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
                }).format(new Date(`${effectiveDate}T12:00:00`))}
                {' · '}
                <span style={{ color: '#1F3D2E' }}>{effectiveTime}</span>
              </p>
              {assignedStaffName && (
                <p className="mt-0.5 text-sm" style={{ color: '#5A5A5A' }}>
                  {t('withStaff', { name: assignedStaffName })}
                </p>
              )}

              {/* Sem botão aqui: o único CTA é o "Continuar" da barra
                  abaixo — dois botões iguais empilhados confundiam. */}
              <p className="mt-2.5 text-xs italic" style={{ color: '#8A8A8A' }}>
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
            {!effectiveDate ? t('chooseDateHint') : t('chooseTimeHint')}
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
