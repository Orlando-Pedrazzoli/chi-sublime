'use client';

import { useState, useTransition } from 'react';
import { X, Phone, Globe, User as UserIcon, Plus } from 'lucide-react';
import {
  createManualBookingAction,
  searchClientsAction,
} from '@/lib/server-actions/admin-bookings';

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
  onClose: () => void;
  onCreated: () => void;
};

type Source = 'phone' | 'walk-in' | 'instagram' | 'website';

export function NewBookingModal({
  staff,
  services,
  defaultDate,
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
  const [staffId, setStaffId] = useState(staff[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('10:00');
  const [source, setSource] = useState<Source>('phone');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);

  const totalDuration = selectedServices.reduce((sum, sid) => {
    const s = services.find((x) => x.id === sid);
    return sum + (s?.duration ?? 0);
  }, 0);

  const totalPrice = selectedServices.reduce((sum, sid) => {
    const s = services.find((x) => x.id === sid);
    return sum + (s?.price ?? 0);
  }, 0);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function doSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const result = await searchClientsAction(q);
    setSearchResults(result.clients);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedServices.length === 0) {
      setError('Seleciona pelo menos um serviço');
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
        initialStatus: 'confirmed',
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        onCreated();
      } else {
        setError(result.error);
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

        <form onSubmit={handleSubmit} className="space-y-6 p-5">
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
                  type="text"
                  value={searchQuery}
                  onChange={(e) => doSearch(e.target.value)}
                  placeholder="Procura por nome, telefone ou email..."
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
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nome completo *"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2 sm:col-span-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                  required={clientMode === 'new'}
                />
                <input
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="Telefone *"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                  required={clientMode === 'new'}
                />
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  className="rounded-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(31,61,46,0.2)' }}
                />
              </div>
            )}
          </Section>

          {/* Serviços */}
          <Section
            label={`Serviços ${selectedServices.length > 0 ? `(${selectedServices.length})` : ''}`}
          >
            <div
              className="max-h-48 overflow-y-auto rounded-md border p-2"
              style={{ borderColor: 'rgba(31,61,46,0.15)' }}
            >
              {services.map((s) => {
                const isSelected = selectedServices.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-amber-50/30"
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
                    <span className="font-mono text-xs" style={{ color: '#5A5A5A' }}>
                      {s.duration}min · {(s.price / 100).toFixed(2)} €
                    </span>
                  </label>
                );
              })}
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

          {/* Erro */}
          {error && (
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
