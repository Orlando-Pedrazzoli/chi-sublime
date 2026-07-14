// 📄 src/components/admin/schedule/HolidaysManager.tsx
'use client';

/**
 * Chi Sublime — Holidays Manager
 * ============================================================
 *
 * Feriados do salão (Schedule type='holiday'). Um feriado fecha
 * o salão nesse dia; com "repete todos os anos", o dia/mês fica
 * bloqueado em qualquer ano (ex: 25 dez).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarOff, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { addHolidayAction, deleteScheduleEntryAction } from '@/lib/server-actions/schedule';

export type HolidayDTO = {
  id: string;
  date: string; // YYYY-MM-DD
  reason?: string;
  recurringYearly: boolean;
};

export type HolidaysManagerProps = {
  initial: HolidayDTO[];
};

function formatDayMonth(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function HolidaysManager({ initial }: HolidaysManagerProps) {
  const toast = useToast();
  const router = useRouter();

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const add = async () => {
    if (!date) {
      toast.error('Escolhe a data do feriado');
      return;
    }
    setAdding(true);
    const res = await addHolidayAction({
      date,
      reason: reason.trim() || undefined,
      recurringYearly: recurring,
    });
    setAdding(false);

    if (res.success) {
      toast.success('Feriado adicionado');
      setDate('');
      setReason('');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const res = await deleteScheduleEntryAction({ id });
    setDeletingId(null);

    if (res.success) {
      toast.success('Feriado removido');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form de adição */}
      <div className="border-chi-border-light grid grid-cols-1 items-end gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1.5fr_auto_auto]">
        <div>
          <label className="text-chi-charcoal-soft mb-1 block text-xs">Data</label>
          <DatePicker value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-chi-charcoal-soft mb-1 block text-xs">Nome</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Natal, Dia de Portugal"
          />
        </div>
        <div className="pb-2.5">
          <Checkbox
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            label={<span className="text-sm">Todos os anos</span>}
          />
        </div>
        <Button onClick={add} loading={adding}>
          <Plus size={16} />
          Adicionar
        </Button>
      </div>

      {/* Lista */}
      {initial.length === 0 ? (
        <div className="border-chi-border flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
          <CalendarOff size={22} className="text-chi-charcoal-light" />
          <p className="text-chi-charcoal-soft text-sm">Sem feriados registados.</p>
        </div>
      ) : (
        <ul className="border-chi-border-light divide-chi-border-light divide-y rounded-md border">
          {initial.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-chi-charcoal w-24 shrink-0 font-mono text-sm">
                  {formatDayMonth(h.date)}
                </span>
                <span className="text-chi-charcoal truncate text-sm">{h.reason || 'Feriado'}</span>
                {h.recurringYearly && (
                  <span className="bg-chi-info-bg text-chi-info inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                    <Repeat size={10} />
                    Anual
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(h.id)}
                disabled={deletingId === h.id}
                aria-label={`Remover feriado ${h.date}`}
                className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger shrink-0 rounded-md p-2 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
