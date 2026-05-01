'use client';

import { useState, useTransition } from 'react';
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  PlayCircle,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  updateBookingStatusAction,
  type AdminBookingForList,
} from '@/lib/server-actions/admin-bookings';

type BookingStatus = AdminBookingForList['status'];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: 'rgba(212,175,110,0.15)', color: '#B8924A' },
  confirmed: { label: 'Confirmada', bg: 'rgba(151,196,89,0.15)', color: '#5C8A2F' },
  'in-progress': { label: 'Em curso', bg: 'rgba(45,84,64,0.15)', color: '#1F3D2E' },
  completed: { label: 'Concluída', bg: 'rgba(31,61,46,0.1)', color: '#1F3D2E' },
  cancelled: { label: 'Cancelada', bg: 'rgba(178,60,60,0.1)', color: '#B23C3C' },
  'no-show': { label: 'Não compareceu', bg: 'rgba(90,90,90,0.1)', color: '#5A5A5A' },
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site',
  phone: 'Telefone',
  'walk-in': 'Walk-in',
  instagram: 'Instagram',
  admin: 'Admin',
};

type BookingDetailModalProps = {
  booking: AdminBookingForList;
  onClose: () => void;
  onChanged: () => void;
};

export function BookingDetailModal({ booking, onClose, onChanged }: BookingDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  function handleStatusChange(newStatus: BookingStatus, reason?: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingStatusAction({
        bookingNumber: booking.bookingNumber,
        newStatus,
        reason,
      });
      if (result.success) {
        onChanged();
      } else {
        setError(result.error);
      }
    });
  }

  const sourceLabel = SOURCE_LABELS[booking.source] ?? booking.source;
  const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(20,40,32,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg sm:rounded-lg"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-start justify-between gap-3 p-5"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#D4AF6E' }}>
              {sourceLabel} · {booking.bookingNumber}
            </p>
            <h2 className="mt-1 font-serif text-2xl">{booking.client.name}</h2>
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

        <div className="space-y-6 p-5">
          <div
            className="rounded-md px-3 py-2 text-center text-xs font-semibold tracking-[0.22em] uppercase"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {badge.label}
          </div>

          <div>
            <p
              className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#5A5A5A' }}
            >
              <Calendar size={14} style={{ color: '#D4AF6E' }} />
              Data e hora
            </p>
            <p className="font-serif text-lg capitalize" style={{ color: '#1A1A1A' }}>
              {dateFmt.format(new Date(booking.startTime))}
            </p>
            <p className="text-sm" style={{ color: '#5A5A5A' }}>
              <Clock size={12} className="mr-1 inline" />
              {timeFmt.format(new Date(booking.startTime))} —{' '}
              {timeFmt.format(new Date(booking.endTime))} · {booking.totalDuration} min
            </p>
          </div>

          {booking.staff && (
            <div>
              <p
                className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                <UserIcon size={14} style={{ color: '#D4AF6E' }} />
                Profissional
              </p>
              <p className="text-base" style={{ color: '#1A1A1A' }}>
                {booking.staff.name}
              </p>
            </div>
          )}

          <div>
            <p
              className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#5A5A5A' }}
            >
              <UserIcon size={14} style={{ color: '#D4AF6E' }} />
              Cliente
            </p>
            <p className="text-base" style={{ color: '#1A1A1A' }}>
              {booking.client.name}
            </p>
            <div className="mt-1 space-y-1 text-sm" style={{ color: '#5A5A5A' }}>
              {booking.client.phone ? (
                <div className="flex items-center gap-2">
                  <Phone size={12} />
                  <span>{booking.client.phone}</span>
                </div>
              ) : null}
              {booking.client.email ? (
                <div className="flex items-center gap-2">
                  <Mail size={12} />
                  <span>{booking.client.email}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <p
              className="mb-2 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: '#5A5A5A' }}
            >
              Serviços
            </p>
            <ul className="space-y-1.5">
              {booking.services.map((s, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-sm"
                  style={{ color: '#1A1A1A' }}
                >
                  <span>{s.name}</span>
                  <span className="font-mono text-xs" style={{ color: '#5A5A5A' }}>
                    {s.duration}min · {(s.price / 100).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="mt-3 flex items-center justify-between border-t pt-3"
              style={{ borderColor: 'rgba(31,61,46,0.08)' }}
            >
              <span className="text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
                Total
              </span>
              <span className="font-mono text-lg font-semibold" style={{ color: '#1F3D2E' }}>
                {(booking.totalPrice / 100).toFixed(2)} €
              </span>
            </div>
          </div>

          {booking.notes ? (
            <div>
              <p
                className="mb-2 text-[10px] tracking-[0.22em] uppercase"
                style={{ color: '#5A5A5A' }}
              >
                Notas
              </p>
              <p className="text-sm italic" style={{ color: '#5A5A5A' }}>
                {booking.notes}
              </p>
            </div>
          ) : null}

          {error ? (
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
          ) : null}

          {confirmCancel ? (
            <div
              className="rounded-md border p-4"
              style={{
                borderColor: 'rgba(178,60,60,0.3)',
                backgroundColor: 'rgba(178,60,60,0.05)',
              }}
            >
              <p className="mb-2 text-sm font-medium" style={{ color: '#B23C3C' }}>
                Cancelar esta reserva?
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Razão do cancelamento (obrigatório)"
                rows={2}
                className="mb-3 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'rgba(31,61,46,0.2)' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled', cancelReason || 'Sem razão')}
                  disabled={isPending || !cancelReason.trim()}
                  className="rounded-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#B23C3C', color: '#FAF7F2' }}
                >
                  Confirmar cancelamento
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  disabled={isPending}
                  className="rounded-md border px-4 py-2 text-xs tracking-wide hover:bg-white"
                  style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#1A1A1A' }}
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}

          {!confirmCancel && booking.status !== 'cancelled' && booking.status !== 'completed' ? (
            <div
              className="grid grid-cols-2 gap-2 border-t pt-4"
              style={{ borderColor: 'rgba(31,61,46,0.08)' }}
            >
              {booking.status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={isPending}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                  style={{ backgroundColor: '#5C8A2F', color: '#FAF7F2' }}
                >
                  <CheckCircle2 size={14} strokeWidth={1.5} />
                  Confirmar reserva
                </button>
              ) : null}

              {booking.status === 'pending' || booking.status === 'confirmed' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange('in-progress')}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                  style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
                >
                  <PlayCircle size={14} strokeWidth={1.5} />
                  Iniciar
                </button>
              ) : null}

              {booking.status === 'in-progress' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isPending}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-semibold tracking-wide transition-all hover:-translate-y-[1px] disabled:opacity-50"
                  style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
                >
                  <CheckCircle2 size={14} strokeWidth={1.5} />
                  Concluir serviço
                </button>
              ) : null}

              {booking.status === 'pending' || booking.status === 'confirmed' ? (
                <button
                  type="button"
                  onClick={() => handleStatusChange('no-show')}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-xs tracking-wide transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#5A5A5A' }}
                >
                  <AlertCircle size={14} strokeWidth={1.5} />
                  Não compareceu
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={isPending}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-xs tracking-wide transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ borderColor: 'rgba(178,60,60,0.3)', color: '#B23C3C' }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Cancelar reserva
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
