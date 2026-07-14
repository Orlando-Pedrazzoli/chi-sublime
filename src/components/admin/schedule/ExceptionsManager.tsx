// 📄 src/components/admin/schedule/ExceptionsManager.tsx
'use client';

/**
 * Chi Sublime — Exceptions Manager
 * ============================================================
 *
 * Exceções pontuais (Schedule type='exception'): um dia em que
 * o salão encerra fora do padrão ("fechado dia 14 para obras")
 * ou abre com horário especial ("véspera de Natal só até às 14h").
 *
 * A exceção tem prioridade sobre feriados e sobre o horário
 * semanal — é a palavra final do admin para aquele dia.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { TimePicker } from '@/components/ui/TimePicker';
import { useToast } from '@/hooks/useToast';
import { deleteScheduleEntryAction, upsertExceptionAction } from '@/lib/server-actions/schedule';

export type ExceptionDTO = {
  id: string;
  date: string; // YYYY-MM-DD
  open: boolean;
  start?: string;
  end?: string;
  reason?: string;
};

export type ExceptionsManagerProps = {
  initial: ExceptionDTO[];
};

function formatDayMonth(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ExceptionsManager({ initial }: ExceptionsManagerProps) {
  const toast = useToast();
  const router = useRouter();

  const [date, setDate] = useState('');
  const [mode, setMode] = useState<'closed' | 'open'>('closed');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const save = async () => {
    if (!date) {
      toast.error('Escolhe a data da exceção');
      return;
    }
    if (mode === 'open' && start >= end) {
      toast.error('A abertura tem de ser antes do fecho');
      return;
    }

    setSaving(true);
    const res = await upsertExceptionAction({
      date,
      open: mode === 'open',
      start: mode === 'open' ? start : undefined,
      end: mode === 'open' ? end : undefined,
      reason: reason.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      toast.success('Exceção guardada');
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
      toast.success('Exceção removida');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="border-chi-border-light space-y-3 rounded-md border p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr]">
          <div>
            <label className="text-chi-charcoal-soft mb-1 block text-xs">Data</label>
            <DatePicker value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-chi-charcoal-soft mb-1 block text-xs">Motivo</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Obras, Evento privado, Véspera de Natal"
            />
          </div>
        </div>

        <RadioGroup
          name="exception-mode"
          value={mode}
          onChange={(value) => setMode(value as 'closed' | 'open')}
          options={[
            { value: 'closed', label: 'Salão encerrado' },
            { value: 'open', label: 'Horário especial' },
          ]}
        />

        {mode === 'open' && (
          <div className="flex flex-wrap items-center gap-2">
            <TimePicker value={start} onChange={(e) => setStart(e.target.value)} className="w-32" />
            <span className="text-chi-charcoal-light">–</span>
            <TimePicker value={end} onChange={(e) => setEnd(e.target.value)} className="w-32" />
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            <Plus size={16} />
            Guardar exceção
          </Button>
        </div>
      </div>

      {/* Lista */}
      {initial.length === 0 ? (
        <div className="border-chi-border flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
          <CalendarClock size={22} className="text-chi-charcoal-light" />
          <p className="text-chi-charcoal-soft text-sm">Sem exceções registadas.</p>
        </div>
      ) : (
        <ul className="border-chi-border-light divide-chi-border-light divide-y rounded-md border">
          {initial.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-chi-charcoal w-24 shrink-0 font-mono text-sm">
                  {formatDayMonth(ex.date)}
                </span>
                {ex.open ? (
                  <span className="bg-chi-warning-bg text-chi-warning inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                    {ex.start}–{ex.end}
                  </span>
                ) : (
                  <span className="bg-chi-danger-bg text-chi-danger inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                    Encerrado
                  </span>
                )}
                <span className="text-chi-charcoal truncate text-sm">{ex.reason}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(ex.id)}
                disabled={deletingId === ex.id}
                aria-label={`Remover exceção ${ex.date}`}
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
