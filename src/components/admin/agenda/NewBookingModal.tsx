// 📄 src/components/admin/agenda/NewBookingModal.tsx
'use client';

/**
 * Chi Sublime — New Booking Modal (Agenda admin)
 * ============================================================
 *
 * MUDANCAS (ligacao ao motor auditado):
 *  - Usa createManualBookingAction de manual-bookings.ts
 *    (ActionResult; valida disponibilidade real, bloqueia dias
 *    passados, sobreposicao SEMPRE verificada + indice E11000).
 *    A action antiga em admin-bookings.ts ficou orfa.
 *  - Checkbox "Forcar encaixe": salta a validacao de horario
 *    (salao/staff/grelha) para walk-ins fora do padrao — nunca
 *    salta a detecao de sobreposicao.
 *  - Prefill de hora + profissional (clique em slot vazio da
 *    vista de dia no AgendaContainer).
 *  - searchClientsAction continua em admin-bookings.ts.
 */

import { useState, useTransition, useEffect, useMemo, useRef } from 'react';
import { X, Phone, Globe, User as UserIcon, Plus, AlertTriangle } from 'lucide-react';
import { createManualBookingAction } from '@/lib/server-actions/manual-bookings';
import { searchClientsAction } from '@/lib/server-actions/admin-bookings';

type StaffOption = { id: string; name: string; photo?: string };
type ServiceOption = {
  id: string;
  name: string;
  price: number;
  duration: number;
  categorySlug?: string;
};
type ClientOption = { id: string; name: string; phone: string; email?: string };

type NewBookingModalProps = {
  staff: StaffOption[];
  services: ServiceOption[];
  defaultDate: string;
  /** Prefill vindo do clique num slot vazio da agenda */
  prefillTime?: string;
  prefillStaffId?: string;
  onClose: () => void;
  onCreated: () => void;
};

type Source = 'phone' | 'walk-in' | 'instagram';

// Ordem e labels das categorias (alinhado com seed-database.ts)
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  cabelereiro: { label: 'Cabelereiro', color: '#1F3D2E' },
  sobrancelhas: { label: 'Sobrancelhas', color: '#D4AF6E' },
  maquilhagem: { label: 'Maquilhagem', color: '#97C459' },
  unhas: { label: 'Unhas', color: '#5DCAA5' },
  depilacao: { label: 'Depilação', color: '#888780' },
};

const CATEGORY_ORDER = ['cabelereiro', 'sobrancelhas', 'maquilhagem', 'unhas', 'depilacao'];

export function NewBookingModal({
  staff,
  services,
  defaultDate,
  prefillTime,
  prefillStaffId,
  onClose,
  onCreated,
}: NewBookingModalProps) {
  const [isPending, startTransition] = useTransition();

  // Cliente
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  // Reserva
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffId, setStaffId] = useState(prefillStaffId ?? staff[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(prefillTime ?? '10:00');
  const [source, setSource] = useState<Source>('phone');
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(false);

  // Tabs de serviços + validação
  const [activeTab, setActiveTab] = useState<string>(CATEGORY_ORDER[0]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agrupar serviços por categoria
  const servicesByCategory = useMemo(() => {
    const groups: Record<string, ServiceOption[]> = {};
    for (const slug of CATEGORY_ORDER) groups[slug] = [];
    for (const s of services) {
      const slug = s.categorySlug ?? 'cabelereiro';
      if (!groups[slug]) groups[slug] = [];
      groups[slug].push(s);
    }
    return groups;
  }, [services]);

  // Categorias disponíveis (com pelo menos 1 serviço)
  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((slug) => (servicesByCategory[slug]?.length ?? 0) > 0),
    [servicesByCategory],
  );

  // Garantir que a tab activa existe
  useEffect(() => {
    if (!availableCategories.includes(activeTab) && availableCategories.length > 0) {
      setActiveTab(availableCategories[0]);
    }
  }, [availableCategories, activeTab]);

  const totalDuration = selectedServices.reduce((sum, sid) => {
    const s = services.find((x) => x.id === sid);
    return sum + (s?.duration ?? 0);
  }, 0);

  const totalPrice = selectedServices.reduce((sum, sid) => {
    const s = services.find((x) => x.id === sid);
    return sum + (s?.price ?? 0);
  }, 0);

  // Contador de serviços seleccionados por categoria
  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sid of selectedServices) {
      const s = services.find((x) => x.id === sid);
      const slug = s?.categorySlug ?? 'cabelereiro';
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  }, [selectedServices, services]);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Debounced client search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchQuery(value);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setError(null);

    if (selectedServices.length === 0) {
      setError('Seleciona pelo menos um serviço');
      return;
    }

    if (selectedServices.length > 5) {
      setError('Máximo de 5 serviços por reserva');
      return;
    }

    if (!staffId) {
      setError('Seleciona um profissional');
      return;
    }

    const isClientValid =
      (clientMode === 'search' && selectedClient) ||
      (clientMode === 'new' && newClientName.trim() && newClientPhone.trim());

    if (!isClientValid) {
      setError('Cliente em falta — escolhe um existente ou cria novo');
      return;
    }

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
        onCreated();
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(20,40,32,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-lg sm:rounded-lg"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#D4AF6E' }}>
              Reserva manual
            </p>
            <h2 className="mt-1 font-serif text-2xl">Nova reserva</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />

          {/* Origem */}
          <Section label="Origem da reserva">
            <div className="grid grid-cols-3 gap-2">
              <SourceButton
                active={source === 'phone'}
                onClick={() => setSource('phone')}
                icon={<Phone size={14} />}
                label="Telefone"
              />
              <SourceButton
                active={source === 'walk-in'}
                onClick={() => setSource('walk-in')}
                icon={<UserIcon size={14} />}
                label="Walk-in"
              />
              <SourceButton
                active={source === 'instagram'}
                onClick={() => setSource('instagram')}
                icon={<Globe size={14} />}
                label="Instagram"
              />
            </div>
          </Section>

          {/* Cliente */}
          <Section label="Cliente">
            <div
              className="mb-3 flex rounded-md border"
              style={{ borderColor: 'rgba(31,61,46,0.2)' }}
            >
              <button
                type="button"
                onClick={() => setClientMode('search')}
                className="flex-1 rounded-l-md px-4 py-2 text-xs font-medium tracking-wide transition-colors"
                style={{
                  backgroundColor: clientMode === 'search' ? '#1F3D2E' : 'transparent',
                  color: clientMode === 'search' ? '#FAF7F2' : '#1A1A1A',
                }}
              >
                Cliente existente
              </button>
              <button
                type="button"
                onClick={() => setClientMode('new')}
                className="flex-1 rounded-r-md px-4 py-2 text-xs font-medium tracking-wide transition-colors"
                style={{
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
                          className="block w-full px-4 py-2 text-left transition-colors hover:bg-amber-50/30"
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

          {/* Serviços com tabs */}
          <Section
            label={`Serviços ${selectedServices.length > 0 ? `(${selectedServices.length}/5)` : ''}`}
          >
            {/* Tabs de categorias */}
            <div
              className="mb-2 flex gap-1 overflow-x-auto rounded-md border p-1"
              style={{
                borderColor: 'rgba(31,61,46,0.15)',
                backgroundColor: 'rgba(250,247,242,0.5)',
              }}
            >
              {availableCategories.map((slug) => {
                const meta = CATEGORY_LABELS[slug];
                const isActive = activeTab === slug;
                const count = selectedCountByCategory[slug] ?? 0;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setActiveTab(slug)}
                    className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide transition-colors"
                    style={{
                      backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? meta.color : '#5A5A5A',
                      boxShadow: isActive ? '0 1px 2px rgba(31,61,46,0.08)' : 'none',
                      borderLeft: isActive ? `3px solid ${meta.color}` : '3px solid transparent',
                    }}
                  >
                    {meta.label}
                    {count > 0 && (
                      <span
                        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        style={{
                          backgroundColor: meta.color,
                          color: '#FAF7F2',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Lista de serviços da tab activa */}
            <div
              className="max-h-72 overflow-y-auto rounded-md border p-2"
              style={{ borderColor: 'rgba(31,61,46,0.15)' }}
            >
              {(servicesByCategory[activeTab] ?? []).map((s) => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-amber-50/30"
                    style={{
                      backgroundColor: isSelected ? 'rgba(212,175,110,0.08)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(s.id)}
                      className="h-4 w-4 cursor-pointer rounded"
                      style={{ accentColor: '#1F3D2E' }}
                    />
                    <span className="flex-1 text-sm" style={{ color: '#1A1A1A' }}>
                      {s.name}
                    </span>
                    <span
                      className="font-mono text-xs whitespace-nowrap"
                      style={{ color: '#5A5A5A' }}
                    >
                      {s.duration}min · {(s.price / 100).toFixed(2)} €
                    </span>
                  </label>
                );
              })}
              {(servicesByCategory[activeTab]?.length ?? 0) === 0 && (
                <p className="py-6 text-center text-xs italic" style={{ color: '#5A5A5A' }}>
                  Sem serviços nesta categoria.
                </p>
              )}
            </div>
          </Section>

          {/* Staff + Data + Hora */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Section label="Profissional">
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Section>
            <Section label="Data">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              />
            </Section>
            <Section label="Hora">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              />
            </Section>
          </div>

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
              onChange={(e) => setForce(e.target.checked)}
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
                Permite agendar fora do horário normal do salão/profissional (ex: walk-in ao fim do
                dia). Sobreposições com outras reservas continuam bloqueadas.
              </span>
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
          {selectedServices.length > 0 && (
            <div
              className="rounded-md border p-3"
              style={{
                backgroundColor: 'rgba(212,175,110,0.08)',
                borderColor: 'rgba(212,175,110,0.3)',
              }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#5A5A5A' }}>
                  Duração total: <strong style={{ color: '#1F3D2E' }}>{totalDuration} min</strong>
                </span>
                <span className="font-mono text-base font-semibold" style={{ color: '#1F3D2E' }}>
                  {(totalPrice / 100).toFixed(2)} €
                </span>
              </div>
            </div>
          )}

          {/* Erro — só após primeira tentativa de submit */}
          {submitAttempted && error && (
            <div
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
            className="flex justify-end gap-2 border-t pt-4"
            style={{ borderColor: 'rgba(31,61,46,0.08)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border px-4 py-2.5 text-xs font-medium tracking-wide hover:bg-gray-50"
              style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1A1A1A' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] disabled:opacity-50"
              style={{ backgroundColor: '#D4AF6E', color: '#1F3D2E' }}
            >
              <Plus size={14} strokeWidth={2} />
              {isPending ? 'A criar...' : 'Criar reserva'}
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
      className="flex flex-col items-center gap-1 rounded-md border px-3 py-3 text-xs font-medium tracking-wide transition-all hover:-translate-y-[1px]"
      style={{
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
