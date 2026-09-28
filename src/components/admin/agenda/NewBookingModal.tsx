// 📄 src/components/admin/agenda/NewBookingModal.tsx
'use client';

/**
 * Chi Sublime — New Booking Modal (Agenda admin)
 * ============================================================
 *
 * Marcação manual criada pelo salão (telefone, walk-in, Instagram).
 *
 * REVISÃO (set. 2026) — auditoria do formulário:
 *  1. Profissional filtrado por competência: quem não faz todos os
 *     serviços escolhidos aparece desativado com o motivo; se o
 *     selecionado deixar de ser elegível, salta para o primeiro que
 *     é e avisa. Sem ninguém elegível: aviso + "marca em separado".
 *  2. Horários disponíveis como chips (getAvailableSlotsAction —
 *     o mesmo motor do site) em vez de hora "às cegas". Com
 *     "Forçar encaixe" volta o campo de hora livre.
 *  3. Categorias DINÂMICAS (vêm da BD) — uma categoria nova no
 *     admin aparece aqui sem mexer em código.
 *  4. Duração total inclui buffers entre serviços (igual ao servidor).
 *  5. Data não permite passado; limite de 5 serviços impedido na UI.
 *  6. Walk-in hoje: hora = agora (arredondada a 5 min) e encaixe
 *     ligado automaticamente — o motor público exige 1h de
 *     antecedência e grelha de 30 min, por isso um walk-in "agora"
 *     seria sempre recusado sem encaixe.
 *  7. Fechar com o formulário a meio pede confirmação.
 *  8. Preços com vírgula (pt-PT).
 *
 * Padrão do projeto: padding/cores críticas em inline style.
 */

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { X, Phone, Globe, User as UserIcon, Plus, AlertTriangle, Info } from 'lucide-react';
import {
  createManualBookingAction,
  type ManualBookingCreated,
} from '@/lib/server-actions/manual-bookings';
import { searchClientsAction } from '@/lib/server-actions/admin-bookings';
import { getAvailableSlotsAction } from '@/lib/server-actions/bookings';
import {
  getQualifiedStaffIds,
  getServicesStaffCannotPerform,
  joinNames,
} from '@/lib/booking/eligibility';
import { SALON_DEFAULT_START } from '@/lib/constants/business';

// ============================================================
// TIPOS
// ============================================================

type StaffOption = { id: string; name: string; photo?: string };
type ServiceOption = {
  id: string;
  name: string;
  price: number;
  duration: number;
  bufferAfter: number;
  staffIds: string[];
  categorySlug?: string;
};
type CategoryOption = { slug: string; name: string; color: string; order: number };
type ClientOption = { id: string; name: string; phone: string; email?: string };

export type Source = 'phone' | 'walk-in' | 'instagram';

type NewBookingModalProps = {
  staff: StaffOption[];
  services: ServiceOption[];
  categories: CategoryOption[];
  defaultDate: string;
  /** Prefill vindo do clique num slot vazio da agenda */
  prefillTime?: string;
  prefillStaffId?: string;
  /** Origem pré-selecionada (o board da dashboard abre já em "walk-in") */
  prefillSource?: Source;
  onClose: () => void;
  onCreated: (created: ManualBookingCreated) => void;
};

type SlotsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; times: string[] }
  | { status: 'closed'; detail?: string }
  | { status: 'error'; message: string };

const MAX_SERVICES = 5;
const OTHER_CATEGORY: CategoryOption = {
  slug: '__outros',
  name: 'Outros',
  color: '#888780',
  order: 9999,
};

// ============================================================
// HELPERS
// ============================================================

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function lisbonParts(): { y: string; mo: string; d: string; h: number; mi: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    y: get('year'),
    mo: get('month'),
    d: get('day'),
    h: Number(get('hour')),
    mi: Number(get('minute')),
  };
}

/** Hoje em Lisboa (YYYY-MM-DD) — o salão trabalha em hora de Lisboa */
function todayISO(): string {
  const { y, mo, d } = lisbonParts();
  return `${y}-${mo}-${d}`;
}

/** Hora atual em Lisboa arredondada para cima aos 5 min ("16:37" → "16:40") */
function nowRoundedTo5(): string {
  const { h, mi } = lisbonParts();
  const total = Math.ceil((h * 60 + mi) / 5) * 5;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ============================================================
// COMPONENTE
// ============================================================

export function NewBookingModal({
  staff,
  services,
  categories,
  defaultDate,
  prefillTime,
  prefillStaffId,
  prefillSource,
  onClose,
  onCreated,
}: NewBookingModalProps) {
  const [isPending, startTransition] = useTransition();
  const minDate = todayISO();

  // Cliente
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  // Marcação
  const initialSource: Source = prefillSource ?? 'phone';
  // Walk-in de hoje: encaixe ligado (o motor exige 1h de antecedência)
  const walkInNow = initialSource === 'walk-in' && defaultDate === minDate;
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffId, setStaffId] = useState(prefillStaffId ?? staff[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate < minDate ? minDate : defaultDate);
  const [time, setTime] = useState(
    prefillTime ?? (walkInNow ? nowRoundedTo5() : SALON_DEFAULT_START),
  );
  const [source, setSource] = useState<Source>(initialSource);
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(walkInNow);
  const [forceAutoNote, setForceAutoNote] = useState(walkInNow);

  // Tabs de serviços + validação
  const [activeTab, setActiveTab] = useState<string>('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffNotice, setStaffNotice] = useState<string | null>(null);

  // Horários disponíveis
  const [slots, setSlots] = useState<SlotsState>({ status: 'idle' });
  const slotsRequestRef = useRef(0);

  // ------------------------------------------------------------
  // Categorias dinâmicas
  // ------------------------------------------------------------
  const servicesByCategory = useMemo(() => {
    const groups = new Map<string, ServiceOption[]>();
    const known = new Set(categories.map((c) => c.slug));
    for (const s of services) {
      const slug =
        s.categorySlug && known.has(s.categorySlug) ? s.categorySlug : OTHER_CATEGORY.slug;
      const list = groups.get(slug) ?? [];
      list.push(s);
      groups.set(slug, list);
    }
    return groups;
  }, [services, categories]);

  const availableCategories = useMemo(() => {
    const list = [...categories]
      .sort((a, b) => a.order - b.order)
      .filter((c) => (servicesByCategory.get(c.slug)?.length ?? 0) > 0);
    if ((servicesByCategory.get(OTHER_CATEGORY.slug)?.length ?? 0) > 0) list.push(OTHER_CATEGORY);
    return list;
  }, [categories, servicesByCategory]);

  const currentTab = availableCategories.some((c) => c.slug === activeTab)
    ? activeTab
    : (availableCategories[0]?.slug ?? '');

  // ------------------------------------------------------------
  // Serviços escolhidos, totais (com buffers, igual ao servidor)
  // ------------------------------------------------------------
  const chosen = useMemo(
    () =>
      selectedServices
        .map((sid) => services.find((x) => x.id === sid))
        .filter((x): x is ServiceOption => Boolean(x)),
    [selectedServices, services],
  );

  const totalDuration = chosen.reduce(
    (sum, s, idx) => sum + s.duration + (idx < chosen.length - 1 ? s.bufferAfter : 0),
    0,
  );
  const totalPrice = chosen.reduce((sum, s) => sum + s.price, 0);
  const maxReached = selectedServices.length >= MAX_SERVICES;

  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    const known = new Set(categories.map((c) => c.slug));
    for (const s of chosen) {
      const slug =
        s.categorySlug && known.has(s.categorySlug) ? s.categorySlug : OTHER_CATEGORY.slug;
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  }, [chosen, categories]);

  // ------------------------------------------------------------
  // Elegibilidade do profissional
  // ------------------------------------------------------------
  const qualifiedStaffIds = useMemo(() => getQualifiedStaffIds(chosen, staff), [chosen, staff]);
  const noOneQualified = chosen.length > 0 && qualifiedStaffIds.length === 0;

  const describeMissing = (s: StaffOption) =>
    joinNames(
      getServicesStaffCannotPerform(s.id, chosen).map((svc) => `«${svc.name}»`),
      'e',
    );

  function toggleService(id: string) {
    setSelectedServices((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERVICES) return prev;
      return [...prev, id];
    });
    setError(null);
  }

  // Se o profissional selecionado deixou de ser elegível, salta para o
  // primeiro elegível e explica. (Derivado dentro do handler de serviços
  // via efeito-livre: reagimos à mudança de `qualifiedStaffIds`.)
  const qualifiedKey = qualifiedStaffIds.join(',');
  useEffect(() => {
    if (chosen.length === 0 || noOneQualified) return;
    if (qualifiedStaffIds.includes(staffId)) return;
    const previous = staff.find((s) => s.id === staffId);
    const next = staff.find((s) => qualifiedStaffIds.includes(s.id));
    if (!next) return;
    // setState aqui é intencional: sincroniza a seleção com uma regra
    // de negócio que mudou (o React pede exatamente isto para "reagir"
    // a uma alteração de props/estado derivado).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaffId(next.id);
    setStaffNotice(
      previous
        ? `${previous.name} não realiza ${describeMissing(previous)} — passámos para ${next.name}.`
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifiedKey]);

  function handleStaffChange(id: string) {
    setStaffId(id);
    setStaffNotice(null);
    setError(null);
  }

  // ------------------------------------------------------------
  // Horários disponíveis (motor público) — só sem "Forçar encaixe"
  // ------------------------------------------------------------
  const serviceKey = selectedServices.join(',');
  useEffect(() => {
    if (force || chosen.length === 0 || !staffId || !date || noOneQualified) {
      return;
    }
    const requestId = ++slotsRequestRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots({ status: 'loading' });

    getAvailableSlotsAction({ date, serviceIds: selectedServices, staffId })
      .then((result) => {
        if (requestId !== slotsRequestRef.current) return;
        if (result.error) {
          setSlots({ status: 'error', message: result.error.message });
          return;
        }
        if (!result.metadata.salonOpen) {
          setSlots({ status: 'closed', detail: result.metadata.closedReasonDetail });
          return;
        }
        setSlots({ status: 'loaded', times: result.slots.map((s) => s.time) });
      })
      .catch(() => {
        if (requestId !== slotsRequestRef.current) return;
        setSlots({ status: 'error', message: 'Erro ao carregar horários. Tenta novamente.' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [force, serviceKey, staffId, date, noOneQualified]);

  const availableTimes = slots.status === 'loaded' ? slots.times : [];
  const timeIsAvailable = force || availableTimes.includes(time);

  function handleSourceChange(next: Source) {
    setSource(next);
    // Walk-in de hoje: hora = agora + encaixe ligado (ver cabeçalho)
    if (next === 'walk-in' && date === minDate) {
      setTime(prefillTime ?? nowRoundedTo5());
      setForce(true);
      setForceAutoNote(true);
    }
  }

  function handleForceChange(checked: boolean) {
    setForce(checked);
    setForceAutoNote(false);
    if (!checked) setSlots({ status: 'idle' });
  }

  // ------------------------------------------------------------
  // Pesquisa de clientes (debounced)
  // ------------------------------------------------------------
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const result = await searchClientsAction(value);
      setSearchResults(result.clients);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ------------------------------------------------------------
  // Fechar com confirmação se houver trabalho a meio
  // ------------------------------------------------------------
  const isDirty =
    selectedServices.length > 0 ||
    selectedClient !== null ||
    newClientName.trim() !== '' ||
    newClientPhone.trim() !== '' ||
    notes.trim() !== '';

  function requestClose() {
    if (isPending) return;
    if (
      isDirty &&
      !window.confirm('Descartar esta marcação? Os dados preenchidos vão perder-se.')
    ) {
      return;
    }
    onClose();
  }

  // ------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setError(null);

    if (selectedServices.length === 0) return setError('Seleciona pelo menos um serviço.');
    if (noOneQualified) {
      return setError(
        'Nenhum profissional faz todos estes serviços na mesma marcação. Marca-os em separado.',
      );
    }
    if (!staffId || !qualifiedStaffIds.includes(staffId)) {
      return setError('Seleciona um profissional que faça todos os serviços escolhidos.');
    }
    if (date < minDate) return setError('Não é possível criar marcações em dias passados.');
    if (!time) return setError('Indica a hora.');
    if (!force && !timeIsAvailable) {
      return setError(
        'Escolhe um dos horários disponíveis, ou liga "Forçar encaixe" para agendar fora da grelha.',
      );
    }

    const isClientValid =
      (clientMode === 'search' && selectedClient) ||
      (clientMode === 'new' && newClientName.trim() && newClientPhone.trim());
    if (!isClientValid) return setError('Cliente em falta — escolhe um existente ou cria novo.');

    startTransition(async () => {
      const result = await createManualBookingAction({
        clientId: clientMode === 'search' ? selectedClient!.id : undefined,
        newClient:
          clientMode === 'new'
            ? {
                name: newClientName.trim(),
                phone: newClientPhone.trim(),
                email: newClientEmail.trim() || undefined,
              }
            : undefined,
        serviceIds: selectedServices,
        staffId,
        date,
        time,
        source,
        status: 'confirmed',
        notes: notes.trim() || undefined,
        force,
      });

      if (result.success) {
        onCreated(result.data);
      } else {
        setError(result.error.message);
      }
    });
  }

  const selectedStaff = staff.find((s) => s.id === staffId);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(20,40,32,0.6)' }}
      onClick={requestClose}
    >
      <div
        className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-lg sm:rounded-lg"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-booking-title"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#D4AF6E' }}>
              Marcação manual
            </p>
            <h2 id="new-booking-title" className="mt-1 font-serif text-2xl">
              Nova marcação
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-2 transition-colors hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-6 p-5">
          {/* Honeypot oculto para travar autofill agressivo do Chrome */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          />

          {/* Origem */}
          <Section label="Origem da marcação">
            <div className="grid grid-cols-3 gap-2">
              <SourceButton
                active={source === 'phone'}
                onClick={() => handleSourceChange('phone')}
                icon={<Phone size={14} />}
                label="Telefone"
              />
              <SourceButton
                active={source === 'walk-in'}
                onClick={() => handleSourceChange('walk-in')}
                icon={<UserIcon size={14} />}
                label="Walk-in"
              />
              <SourceButton
                active={source === 'instagram'}
                onClick={() => handleSourceChange('instagram')}
                icon={<Globe size={14} />}
                label="Instagram"
              />
            </div>
          </Section>

          {/* Cliente */}
          <Section label="Cliente">
            <div
              className="flex overflow-hidden border"
              style={{
                marginBottom: '12px',
                borderRadius: '8px',
                borderColor: 'rgba(31,61,46,0.2)',
              }}
            >
              <button
                type="button"
                onClick={() => setClientMode('search')}
                className="flex-1 text-xs font-medium tracking-wide transition-colors"
                style={{
                  padding: '9px 16px',
                  backgroundColor: clientMode === 'search' ? '#1F3D2E' : 'transparent',
                  color: clientMode === 'search' ? '#FAF7F2' : '#1A1A1A',
                }}
              >
                Cliente existente
              </button>
              <button
                type="button"
                onClick={() => setClientMode('new')}
                className="flex-1 text-xs font-medium tracking-wide transition-colors"
                style={{
                  padding: '9px 16px',
                  borderLeft: '1px solid rgba(31,61,46,0.2)',
                  backgroundColor: clientMode === 'new' ? '#1F3D2E' : 'transparent',
                  color: clientMode === 'new' ? '#FAF7F2' : '#1A1A1A',
                }}
              >
                Novo cliente
              </button>
            </div>

            {clientMode === 'search' ? (
              <div className="space-y-2">
                <input
                  type="search"
                  name="chi-client-search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Procura por nome, telefone ou email..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
                {selectedClient && (
                  <div
                    className="rounded-md border p-3"
                    style={{
                      backgroundColor: 'rgba(151,196,89,0.08)',
                      borderColor: 'rgba(151,196,89,0.3)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: '#1F3D2E' }}>
                      {selectedClient.name}
                    </p>
                    <p className="text-xs" style={{ color: '#5A5A5A' }}>
                      {selectedClient.phone}
                      {selectedClient.email && ` · ${selectedClient.email}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="mt-1 text-xs underline"
                      style={{ color: '#B23C3C' }}
                    >
                      Trocar cliente
                    </button>
                  </div>
                )}
                {!selectedClient && searchResults.length > 0 && (
                  <ul
                    className="max-h-48 overflow-y-auto rounded-md border"
                    style={{ borderColor: 'rgba(31,61,46,0.1)' }}
                  >
                    {searchResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(c);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="block w-full text-left transition-colors hover:bg-amber-50/30"
                          style={{ padding: '9px 16px' }}
                        >
                          <p className="text-sm" style={{ color: '#1A1A1A' }}>
                            {c.name}
                          </p>
                          <p className="text-xs" style={{ color: '#5A5A5A' }}>
                            {c.phone}
                            {c.email && ` · ${c.email}`}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!selectedClient &&
                  searchQuery.trim().length >= 2 &&
                  searchResults.length === 0 && (
                    <p className="px-3 py-2 text-xs italic" style={{ color: '#5A5A5A' }}>
                      Nenhum cliente encontrado. Usa &quot;Novo cliente&quot; para registar.
                    </p>
                  )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  name="chi-new-client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nome completo *"
                  autoComplete="off"
                  data-lpignore="true"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2 sm:col-span-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
                <input
                  type="tel"
                  name="chi-new-client-phone"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="Telefone *"
                  autoComplete="off"
                  data-lpignore="true"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
                <input
                  type="email"
                  name="chi-new-client-email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  autoComplete="off"
                  data-lpignore="true"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
              </div>
            )}
          </Section>

          {/* Serviços — tabs dinâmicas por categoria */}
          <Section
            label={`Serviços${selectedServices.length > 0 ? ` (${selectedServices.length}/${MAX_SERVICES})` : ''}`}
          >
            <div
              className="flex overflow-x-auto border"
              style={{
                gap: '4px',
                padding: '4px',
                marginBottom: '8px',
                borderRadius: '8px',
                borderColor: 'rgba(31,61,46,0.15)',
                backgroundColor: 'rgba(250,247,242,0.5)',
              }}
            >
              {availableCategories.map((cat) => {
                const isActive = currentTab === cat.slug;
                const count = selectedCountByCategory[cat.slug] ?? 0;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setActiveTab(cat.slug)}
                    className="flex shrink-0 items-center text-xs font-medium tracking-wide transition-colors"
                    style={{
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? cat.color : '#5A5A5A',
                      boxShadow: isActive ? '0 1px 2px rgba(31,61,46,0.08)' : 'none',
                      borderLeft: isActive ? `3px solid ${cat.color}` : '3px solid transparent',
                    }}
                  >
                    {cat.name}
                    {count > 0 && (
                      <span
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        style={{ backgroundColor: cat.color, color: '#FAF7F2' }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className="max-h-72 overflow-y-auto rounded-md border p-2"
              style={{ borderColor: 'rgba(31,61,46,0.15)' }}
            >
              {(servicesByCategory.get(currentTab) ?? []).map((s) => {
                const isSelected = selectedServices.includes(s.id);
                const isBlocked = !isSelected && maxReached;
                const doers =
                  s.staffIds.length === 0
                    ? null
                    : staff.filter((st) => s.staffIds.includes(st.id)).map((st) => st.name);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-amber-50/30"
                    style={{
                      backgroundColor: isSelected ? 'rgba(212,175,110,0.08)' : 'transparent',
                      opacity: isBlocked ? 0.45 : 1,
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isBlocked}
                      onChange={() => toggleService(s.id)}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: '#1F3D2E' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm" style={{ color: '#1A1A1A' }}>
                        {s.name}
                      </span>
                      {doers && (
                        <span className="block text-[11px]" style={{ color: '#8A8A8A' }}>
                          {doers.length === 0 ? 'Sem profissional ativo' : joinNames(doers, 'e')}
                        </span>
                      )}
                    </span>
                    <span
                      className="font-mono text-xs whitespace-nowrap"
                      style={{ color: '#5A5A5A' }}
                    >
                      {s.duration}min · {formatPrice(s.price)}
                    </span>
                  </label>
                );
              })}
              {(servicesByCategory.get(currentTab)?.length ?? 0) === 0 && (
                <p className="py-6 text-center text-xs italic" style={{ color: '#5A5A5A' }}>
                  Sem serviços nesta categoria.
                </p>
              )}
            </div>
            {maxReached && (
              <p className="mt-2 text-xs italic" style={{ color: '#8A8A8A' }}>
                Máximo de {MAX_SERVICES} serviços por marcação. Para escolher outro, desmarca um.
              </p>
            )}
          </Section>

          {/* Sem ninguém elegível */}
          {noOneQualified && (
            <Notice tone="warning">
              Nenhum profissional faz todos estes serviços na mesma marcação:{' '}
              {chosen.map((svc, i) => {
                const names = staff
                  .filter((st) => svc.staffIds.length === 0 || svc.staffIds.includes(st.id))
                  .map((st) => st.name);
                return (
                  <span key={svc.id}>
                    {i > 0 && '; '}«{svc.name}» —{' '}
                    {names.length ? joinNames(names, 'e') : 'ninguém ativo'}
                  </span>
                );
              })}
              . Cria uma marcação para cada profissional.
            </Notice>
          )}

          {/* Profissional + Data + Hora */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Section label="Profissional">
              <select
                value={staffId}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              >
                {staff.map((s) => {
                  const eligible = chosen.length === 0 || qualifiedStaffIds.includes(s.id);
                  return (
                    <option key={s.id} value={s.id} disabled={!eligible}>
                      {eligible ? s.name : `${s.name} — não faz ${describeMissing(s)}`}
                    </option>
                  );
                })}
              </select>
            </Section>
            <Section label="Data">
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              />
            </Section>
            <Section label={force ? 'Hora (livre)' : 'Hora'}>
              <input
                type="time"
                value={time}
                step={force ? 300 : 1800}
                onChange={(e) => {
                  setTime(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{
                  borderColor:
                    !force && time && slots.status === 'loaded' && !timeIsAvailable
                      ? 'rgba(196,134,30,0.6)'
                      : 'rgba(31,61,46,0.2)',
                }}
              />
            </Section>
          </div>

          {staffNotice && <Notice tone="info">{staffNotice}</Notice>}

          {/* Horários disponíveis (chips) */}
          {!force && chosen.length > 0 && !noOneQualified && (
            <div>
              <p
                className="mb-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                Horários livres{selectedStaff ? ` · ${selectedStaff.name}` : ''}
                {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
              </p>
              {slots.status === 'loading' && (
                <p className="text-xs italic" style={{ color: '#8A8A8A' }}>
                  A carregar horários…
                </p>
              )}
              {slots.status === 'closed' && (
                <Notice tone="warning">
                  Salão encerrado neste dia{slots.detail ? ` (${slots.detail})` : ''}. Para um
                  encaixe excecional, liga &quot;Forçar encaixe&quot;.
                </Notice>
              )}
              {slots.status === 'error' && <Notice tone="warning">{slots.message}</Notice>}
              {slots.status === 'loaded' && slots.times.length === 0 && (
                <Notice tone="warning">
                  {selectedStaff?.name ?? 'Este profissional'} não tem horários livres neste dia
                  para {formatDuration(totalDuration)}. Escolhe outro dia ou profissional, ou liga
                  &quot;Forçar encaixe&quot;.
                </Notice>
              )}
              {slots.status === 'loaded' && slots.times.length > 0 && (
                <div className="flex flex-wrap" style={{ gap: '6px' }}>
                  {slots.times.map((t) => {
                    const active = t === time;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTime(t);
                          setError(null);
                        }}
                        aria-pressed={active}
                        className="font-mono text-xs transition-all hover:-translate-y-[1px]"
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${active ? '#1F3D2E' : 'rgba(31,61,46,0.2)'}`,
                          backgroundColor: active ? '#1F3D2E' : '#FFFFFF',
                          color: active ? '#FAF7F2' : '#1A1A1A',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
              {slots.status === 'loaded' && slots.times.length > 0 && time && !timeIsAvailable && (
                <p className="mt-2 text-xs" style={{ color: '#C4861E' }}>
                  {time} não está na grelha de horários livres — escolhe um chip acima ou liga
                  &quot;Forçar encaixe&quot;.
                </p>
              )}
            </div>
          )}

          {/* Forçar encaixe */}
          <label
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors"
            style={{
              borderColor: force ? 'rgba(196,134,30,0.4)' : 'rgba(31,61,46,0.15)',
              backgroundColor: force ? 'rgba(196,134,30,0.06)' : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => handleForceChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded"
              style={{ accentColor: '#C4861E' }}
            />
            <span>
              <span
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: '#1A1A1A' }}
              >
                <AlertTriangle size={13} style={{ color: '#C4861E' }} />
                Forçar encaixe
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: '#5A5A5A' }}>
                Permite agendar fora do horário normal do salão/profissional e da grelha de 30 min
                (ex.: walk-in agora, ou ao fim do dia). Sobreposições com outras marcações e
                serviços que o profissional não faz continuam bloqueados.
              </span>
              {forceAutoNote && force && (
                <span className="mt-1.5 block text-xs" style={{ color: '#C4861E' }}>
                  Walk-in de hoje: ligámos o encaixe e pusemos a hora atual ({time}) — podes
                  alterar.
                </span>
              )}
            </span>
          </label>

          {/* Notas */}
          <Section label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Alergias, preferências..."
              className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: 'rgba(31,61,46,0.2)' }}
            />
          </Section>

          {/* Resumo */}
          {chosen.length > 0 && (
            <div
              className="rounded-md border p-3"
              style={{
                backgroundColor: 'rgba(212,175,110,0.08)',
                borderColor: 'rgba(212,175,110,0.3)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span style={{ color: '#5A5A5A' }}>
                  {chosen.length === 1 ? '1 serviço' : `${chosen.length} serviços`} ·{' '}
                  <strong style={{ color: '#1F3D2E' }}>{formatDuration(totalDuration)}</strong>
                  {chosen.length > 1 && (
                    <span className="text-xs" style={{ color: '#8A8A8A' }}>
                      {' '}
                      (inclui intervalos entre serviços)
                    </span>
                  )}
                </span>
                <span className="font-mono text-base font-semibold" style={{ color: '#1F3D2E' }}>
                  {formatPrice(totalPrice)}
                </span>
              </div>
              {selectedStaff && time && (
                <p className="mt-1.5 text-xs" style={{ color: '#5A5A5A' }}>
                  {new Intl.DateTimeFormat('pt-PT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date(`${date}T12:00:00`))}{' '}
                  · {time} · com {selectedStaff.name}
                </p>
              )}
            </div>
          )}

          {/* Erro — só após primeira tentativa de submit */}
          {submitAttempted && error && (
            <div
              role="alert"
              className="rounded-md border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(178,60,60,0.3)',
                backgroundColor: 'rgba(178,60,60,0.08)',
                color: '#B23C3C',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <div
            className="flex justify-end border-t"
            style={{ gap: '10px', paddingTop: '16px', borderColor: 'rgba(31,61,46,0.08)' }}
          >
            <button
              type="button"
              onClick={requestClose}
              disabled={isPending}
              className="border text-xs font-medium tracking-wide hover:bg-gray-50"
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                borderColor: 'rgba(31,61,46,0.2)',
                color: '#1A1A1A',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] disabled:opacity-50"
              style={{
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                backgroundColor: '#D4AF6E',
                color: '#1F3D2E',
              }}
            >
              <Plus size={14} strokeWidth={2} />
              {isPending ? 'A criar...' : 'Criar marcação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'warning'; children: React.ReactNode }) {
  const color = tone === 'warning' ? '#C4861E' : '#1F3D2E';
  const bg = tone === 'warning' ? 'rgba(196,134,30,0.08)' : 'rgba(31,61,46,0.06)';
  const border = tone === 'warning' ? 'rgba(196,134,30,0.35)' : 'rgba(31,61,46,0.2)';
  return (
    <div
      role={tone === 'warning' ? 'alert' : 'status'}
      className="flex items-start gap-2 rounded-md border text-xs leading-relaxed"
      style={{ padding: '10px 12px', backgroundColor: bg, borderColor: border, color: '#3D3D3D' }}
    >
      {tone === 'warning' ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color }} />
      ) : (
        <Info size={14} className="mt-0.5 shrink-0" style={{ color }} />
      )}
      <span>{children}</span>
    </div>
  );
}

function SourceButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center border text-xs font-medium tracking-wide transition-all hover:-translate-y-[1px]"
      style={{
        gap: '4px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: active ? '#1F3D2E' : 'transparent',
        borderColor: active ? '#1F3D2E' : 'rgba(31,61,46,0.2)',
        color: active ? '#FAF7F2' : '#1A1A1A',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
