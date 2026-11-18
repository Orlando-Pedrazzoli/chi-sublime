// 📄 src/components/admin/agenda/AgendaContainer.tsx
'use client';

/**
 * Chi Sublime — Agenda Container (admin)
 * ============================================================
 *
 * MUDANCA: prefill do slot vazio implementado (era o TODO
 * "Sprint 5C parte 2") — clicar num slot vazio da vista de dia
 * abre o NewBookingModal ja com a hora e o profissional
 * preenchidos.
 *
 * REVISÃO (set. 2026):
 *  - Fechar o modal limpa o `?new=1` do URL (um F5 reabria-o).
 *  - Ao criar uma marcação, a agenda navega para o dia da marcação
 *    (vista de dia) e mostra um toast com cliente/profissional/hora
 *    — o funcionário vê o que acabou de criar.
 *  - Categorias do modal vêm da BD (meta.categories).
 *
 * MOBILE TIPO APP (nov. 2026) — abaixo de lg (1024px):
 *  - Cabeçalho próprio, fixo por baixo da topbar: data grande (toca-se
 *    para abrir o calendário nativo), setas, "Hoje", faixa da semana
 *    (um toque muda de dia) e o seletor Dia | Semana | Próximas a toda
 *    a largura. A barra de ferramentas do desktop não aparece.
 *  - A vista de dia é a <MobileDayAgenda /> (lista vertical com chips
 *    da equipa e intervalos livres tocáveis), não a grelha.
 *  - "Nova marcação" não se repete: em mobile já está na topbar.
 *
 * REVISÃO (nov. 2026):
 *  - A vista de dia recebe `dayInfo` (horário do salão e de cada
 *    profissional nesse dia) para sombrear o que não é marcável.
 *  - O detalhe da marcação recebe a equipa — permite REMARCAR.
 *
 * FIX (out. 2026) — datas sempre no fuso do salão:
 *  - "Hoje" e as setas ‹ › faziam contas com toISOString() (UTC).
 *    Passam a usar lib/utils/salon-day.ts (strings YYYY-MM-DD em
 *    hora de Lisboa), tal como a vista de semana.
 */

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import {
  addDaysISO,
  dayOfMonthISO,
  isISODay,
  salonDayISO,
  weekDaysISO,
  weekdayOfISO,
} from '@/lib/utils/salon-day';
import { SALON_HOURS } from '@/lib/constants/business';
import { MobileDayAgenda } from './MobileDayAgenda';
import type { ManualBookingCreated } from '@/lib/server-actions/manual-bookings';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { BookingDetailModal } from './BookingDetailModal';
import { UpcomingListView } from './UpcomingListView';
import { NewBookingModal } from './NewBookingModal';
import {
  getBookingsByDayAction,
  getBookingsByWeekAction,
  getUpcomingBookingsAction,
  type AdminBookingForList,
  type AdminBookingMeta,
  type AgendaDayInfo,
} from '@/lib/server-actions/admin-bookings';

type AgendaContainerProps = {
  initialDate: string;
  initialView: 'day' | 'week' | 'list';
  initialBookings: AdminBookingForList[];
  /** Horário do salão/profissionais do dia inicial (só na vista de dia) */
  initialDayInfo?: AgendaDayInfo | null;
  staff: Array<{ id: string; name: string; photo?: string }>;
  services: AdminBookingMeta['services'];
  categories: AdminBookingMeta['categories'];
  openNewModalInitially?: boolean;
};

type AgendaView = 'day' | 'week' | 'list';

const VIEW_OPTIONS: Array<{ value: AgendaView; label: string }> = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'list', label: 'Próximas' },
];

/** Segunda → Domingo (ordem de weekDaysISO) */
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Os dias são strings YYYY-MM-DD; formatam-se a partir do meio-dia UTC
// desse dia, em UTC — o resultado não depende do fuso do dispositivo.
const TITLE_WEEKDAY = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', weekday: 'long' });
const TITLE_DAY = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const TITLE_SHORT = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

type NewBookingPrefill = {
  time?: string;
  staffId?: string;
};

export function AgendaContainer({
  initialDate,
  initialView,
  initialBookings,
  initialDayInfo = null,
  staff,
  services,
  categories,
  openNewModalInitially = false,
}: AgendaContainerProps) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState<'day' | 'week' | 'list'>(initialView);
  const [bookings, setBookings] = useState(initialBookings);
  // Dia a que `bookings`/`dayInfo` dizem respeito. Enquanto o pedido do
  // novo dia não chega, o sombreado do dia anterior NÃO é mostrado por
  // cima do novo (folga de terça pintada na quarta).
  const [dayInfo, setDayInfo] = useState<{ date: string; info: AgendaDayInfo } | null>(
    initialDayInfo ? { date: initialDate, info: initialDayInfo } : null,
  );
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingForList | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(openNewModalInitially);
  const [newBookingPrefill, setNewBookingPrefill] = useState<NewBookingPrefill | null>(null);

  const refresh = useCallback(async (newDate: string, newView: 'day' | 'week' | 'list') => {
    const result =
      newView === 'day'
        ? await getBookingsByDayAction(newDate)
        : newView === 'week'
          ? await getBookingsByWeekAction(newDate)
          : await getUpcomingBookingsAction(newDate);
    if (result.success) {
      setBookings(result.bookings);
      if ('dayInfo' in result) setDayInfo({ date: newDate, info: result.dayInfo });
    }
  }, []);

  function navigateToDate(newDate: string, newView?: 'day' | 'week' | 'list') {
    // O <input type="date"> devolve '' quando o utilizador limpa o campo
    if (!isISODay(newDate)) return;
    const v = newView ?? view;
    setDate(newDate);
    if (newView) setView(newView);

    // Atualiza URL sem reload
    const params = new URLSearchParams(searchParams);
    params.set('date', newDate);
    params.set('view', v);
    params.delete('new');
    router.replace(`/admin/marcacoes?${params.toString()}`);

    startTransition(async () => {
      await refresh(newDate, v);
    });
  }

  function handleViewChange(newView: 'day' | 'week' | 'list') {
    navigateToDate(date, newView);
  }

  /** Passo das setas ‹ ›: 1 dia, 1 semana ou 2 semanas (lista) */
  function stepDays(): number {
    return view === 'day' ? 1 : view === 'week' ? 7 : 14;
  }

  function handlePrevDate() {
    navigateToDate(addDaysISO(date, -stepDays()));
  }

  function handleNextDate() {
    navigateToDate(addDaysISO(date, stepDays()));
  }

  function handleToday() {
    // Hoje EM LISBOA — toISOString() dava o dia UTC (ontem, entre a
    // meia-noite e a 01:00 no horário de verão).
    navigateToDate(salonDayISO());
  }

  function handleRefresh() {
    startTransition(async () => {
      await refresh(date, view);
    });
  }

  function handleBookingChanged() {
    handleRefresh();
    setSelectedBooking(null);
  }

  function openNewBooking(prefill?: NewBookingPrefill) {
    setNewBookingPrefill(prefill ?? null);
    setNewBookingOpen(true);
  }

  function closeNewBooking() {
    setNewBookingOpen(false);
    setNewBookingPrefill(null);
    // Limpar ?new=1 — senão um F5 reabria o modal.
    // history.replaceState (e não router.replace): é só cosmética de URL,
    // não precisa de round-trip ao servidor, e evita empilhar navegações
    // do App Router em cima do refresh que a server action já disparou
    // (revalidatePath) — essa sobreposição deixava o router pendente e
    // a página "presa" em loading.
    if (typeof window !== 'undefined' && searchParams.get('new')) {
      const params = new URLSearchParams(searchParams);
      params.delete('new');
      const qs = params.toString();
      window.history.replaceState(null, '', `/admin/marcacoes${qs ? `?${qs}` : ''}`);
    }
  }

  function handleNewBookingCreated(created: ManualBookingCreated) {
    closeNewBooking();
    const createdDate = salonDayISO(created.startTime);
    const createdTime = new Intl.DateTimeFormat('pt-PT', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(created.startTime));
    toast.success(
      `Marcação ${created.bookingNumber} criada — ${created.clientName} com ${created.staffName}, ${createdTime}.`,
    );
    // Mostrar o dia da marcação criada (vista de dia) em vez de ficar
    // no dia/vista onde o funcionário estava. Adiado para o próximo tick:
    // este callback corre DENTRO da transition do modal (que ainda está a
    // fechar) — navegar aí deixava o App Router num estado pendente.
    const goToCreated = createdDate !== date || view !== 'day';
    window.setTimeout(() => {
      if (goToCreated) {
        navigateToDate(createdDate, 'day');
      } else {
        handleRefresh();
      }
    }, 0);
  }

  const todayISO = salonDayISO();
  const currentDayInfo = dayInfo?.date === date ? dayInfo.info : null;

  // Título do cabeçalho mobile, conforme a vista
  const noon = new Date(`${date}T12:00:00Z`);
  let mobileTitle: string;
  let mobileSub: string;
  if (view === 'day') {
    mobileTitle =
      date === todayISO
        ? 'Hoje'
        : date === addDaysISO(todayISO, 1)
          ? 'Amanhã'
          : date === addDaysISO(todayISO, -1)
            ? 'Ontem'
            : TITLE_WEEKDAY.format(noon);
    mobileSub = TITLE_DAY.format(noon);
  } else if (view === 'week') {
    const days = weekDaysISO(date);
    mobileTitle = 'Semana';
    mobileSub = `${TITLE_SHORT.format(new Date(`${days[0]}T12:00:00Z`))} – ${TITLE_SHORT.format(new Date(`${days[6]}T12:00:00Z`))}`;
  } else {
    mobileTitle = 'Próximas';
    mobileSub = `a partir de ${TITLE_SHORT.format(noon)}`;
  }

  return (
    <>
      {/* ── Cabeçalho MOBILE (tipo app) ─────────────────────── */}
      <div className="agm-head lg:hidden">
        <div className="agm-head-row">
          <button
            type="button"
            className="agm-icon-btn"
            onClick={handlePrevDate}
            aria-label={view === 'day' ? 'Dia anterior' : 'Anterior'}
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>

          <label className="agm-date">
            <span className="agm-date-title">{mobileTitle}</span>
            <span className="agm-date-sub">{mobileSub}</span>
            <input
              type="date"
              value={date}
              aria-label="Escolher data"
              onChange={(e) => navigateToDate(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="agm-icon-btn"
            onClick={handleNextDate}
            aria-label={view === 'day' ? 'Dia seguinte' : 'Seguinte'}
          >
            <ChevronRight size={22} strokeWidth={1.75} />
          </button>

          {date !== todayISO ? (
            <button type="button" className="agm-today-btn admin-press" onClick={handleToday}>
              Hoje
            </button>
          ) : (
            <button
              type="button"
              className="agm-icon-btn"
              onClick={handleRefresh}
              disabled={isPending}
              aria-label="Atualizar"
            >
              <RotateCw size={18} strokeWidth={1.75} className={isPending ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {view === 'day' ? (
          <div className="agm-week" role="group" aria-label="Dias da semana">
            {weekDaysISO(date).map((iso, idx) => (
              <button
                key={iso}
                type="button"
                className="agm-day admin-press"
                data-selected={iso === date}
                data-today={iso === todayISO}
                data-closed={!SALON_HOURS[weekdayOfISO(iso)].open}
                aria-pressed={iso === date}
                aria-label={`${WEEKDAY_LABELS[idx]} ${dayOfMonthISO(iso)}`}
                onClick={() => navigateToDate(iso)}
              >
                <span className="agm-day-name">{WEEKDAY_LABELS[idx]}</span>
                <span className="agm-day-num">{dayOfMonthISO(iso)}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="agm-seg" role="group" aria-label="Vista">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => handleViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar DESKTOP ─────────────────────────────────── */}
      <div className="mb-6 hidden flex-wrap items-center justify-between gap-3 lg:flex">
        {/* Navegação datas */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="rounded-md border px-3 py-2 text-xs font-medium tracking-wide transition-colors hover:bg-white"
            style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1F3D2E' }}
          >
            Hoje
          </button>

          <div
            className="flex items-center rounded-md border"
            style={{ borderColor: 'rgba(31,61,46,0.2)' }}
          >
            <button
              type="button"
              onClick={handlePrevDate}
              aria-label="Anterior"
              className="rounded-l-md p-2 transition-colors hover:bg-white"
              style={{ color: '#1F3D2E' }}
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleNextDate}
              aria-label="Seguinte"
              className="rounded-r-md p-2 transition-colors hover:bg-white"
              style={{ borderLeft: '1px solid rgba(31,61,46,0.2)', color: '#1F3D2E' }}
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Date picker */}
          <input
            type="date"
            value={date}
            onChange={(e) => navigateToDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-white"
            style={{
              borderColor: 'rgba(31,61,46,0.2)',
              color: '#1F3D2E',
              backgroundColor: 'transparent',
            }}
          />

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            aria-label="Recarregar"
            className="border transition-colors hover:bg-white disabled:opacity-50"
            style={{
              padding: '8px',
              borderRadius: '8px',
              borderColor: 'rgba(31,61,46,0.2)',
              color: '#1F3D2E',
            }}
          >
            <RotateCw size={16} strokeWidth={1.5} className={isPending ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* View toggle + Nova marcação */}
        <div className="flex items-center gap-3">
          <div
            className="flex overflow-hidden border"
            style={{ borderRadius: '8px', borderColor: 'rgba(31,61,46,0.2)' }}
          >
            <button
              type="button"
              onClick={() => handleViewChange('day')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'day' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                backgroundColor: view === 'day' ? '#1F3D2E' : 'transparent',
                color: view === 'day' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('week')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'week' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                borderLeft: '1px solid rgba(31,61,46,0.2)',
                backgroundColor: view === 'week' ? '#1F3D2E' : 'transparent',
                color: view === 'week' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('list')}
              className={cn(
                'text-xs font-medium tracking-wide transition-colors',
                view === 'list' ? '' : 'hover:bg-white',
              )}
              style={{
                padding: '9px 16px',
                borderLeft: '1px solid rgba(31,61,46,0.2)',
                backgroundColor: view === 'list' ? '#1F3D2E' : 'transparent',
                color: view === 'list' ? '#FAF7F2' : '#1F3D2E',
              }}
            >
              Próximas
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewBooking()}
            className="inline-flex items-center text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px]"
            style={{
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              backgroundColor: '#D4AF6E',
              color: '#1F3D2E',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Nova marcação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Hint: dia sem marcações → atalho para a lista de próximas */}
      {view === 'day' && !isPending && bookings.length === 0 && (
        <div
          className="mb-4 hidden flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 lg:flex"
          style={{
            borderColor: 'rgba(212,175,110,0.4)',
            backgroundColor: 'rgba(212,175,110,0.08)',
          }}
        >
          <p className="text-sm" style={{ color: '#5A4A2A' }}>
            Sem marcações neste dia — vê o que está agendado para os próximos dias.
          </p>
          <button
            type="button"
            onClick={() => handleViewChange('list')}
            className="text-xs font-semibold tracking-wide uppercase transition-all hover:-translate-y-[1px]"
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              backgroundColor: '#D4AF6E',
              color: '#1F3D2E',
            }}
          >
            Ver próximas marcações
          </button>
        </div>
      )}

      {/* Vista actual */}
      {view === 'day' ? (
        <>
          {/* Desktop: grelha por profissional */}
          <div className="hidden lg:block">
            <CalendarDayView
              date={date}
              bookings={bookings}
              staff={staff}
              dayInfo={currentDayInfo}
              onBookingClick={setSelectedBooking}
              onEmptySlotClick={(time, staffId) => {
                // Prefill: abre o modal já com hora + profissional do slot clicado
                openNewBooking({ time, staffId });
              }}
            />
          </div>
          {/* Mobile/tablet: lista vertical tipo app */}
          <div className="lg:hidden">
            <MobileDayAgenda
              date={date}
              bookings={bookings}
              staff={staff}
              dayInfo={currentDayInfo}
              onBookingClick={setSelectedBooking}
              onEmptySlotClick={(time, staffId) => openNewBooking({ time, staffId })}
              onNewBooking={() => openNewBooking()}
            />
          </div>
        </>
      ) : view === 'week' ? (
        <CalendarWeekView
          weekStart={date}
          bookings={bookings}
          onBookingClick={setSelectedBooking}
          onDayClick={(d) => navigateToDate(d, 'day')}
        />
      ) : (
        <UpcomingListView bookings={bookings} onBookingClick={setSelectedBooking} />
      )}

      {/* Modais */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          staff={staff}
          onClose={() => setSelectedBooking(null)}
          onChanged={handleBookingChanged}
        />
      )}

      {newBookingOpen && (
        <NewBookingModal
          staff={staff}
          services={services}
          categories={categories}
          defaultDate={date}
          prefillTime={newBookingPrefill?.time}
          prefillStaffId={newBookingPrefill?.staffId}
          onClose={closeNewBooking}
          onCreated={handleNewBookingCreated}
        />
      )}
    </>
  );
}
