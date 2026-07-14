// 📄 src/components/admin/schedule/SalonHoursEditor.tsx
'use client';

/**
 * Chi Sublime — Salon Hours Editor
 * ============================================================
 *
 * Horário semanal do SALÃO (Schedule type='regular').
 * Mesmo padrão visual do WorkingHoursEditor da equipa, para
 * o Jean Pierre não ter de aprender duas interfaces.
 *
 * Este horário define a janela máxima de todos os agendamentos:
 * a disponibilidade real de cada profissional é a interseção
 * deste horário com o horário individual dele.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { TimePicker } from '@/components/ui/TimePicker';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import { setSalonWeekAction } from '@/lib/server-actions/schedule';

type Break = { start: string; end: string };

export type SalonDayDTO = {
  dayOfWeek: number; // 0=Dom ... 6=Sáb
  open: boolean;
  start: string;
  end: string;
  breaks: Break[];
};

// Ordem de exibição: Segunda → Domingo
const DAYS: { dayOfWeek: number; label: string }[] = [
  { dayOfWeek: 1, label: 'Segunda' },
  { dayOfWeek: 2, label: 'Terça' },
  { dayOfWeek: 3, label: 'Quarta' },
  { dayOfWeek: 4, label: 'Quinta' },
  { dayOfWeek: 5, label: 'Sexta' },
  { dayOfWeek: 6, label: 'Sábado' },
  { dayOfWeek: 0, label: 'Domingo' },
];

const DEFAULT_DAY = (dayOfWeek: number): SalonDayDTO => ({
  dayOfWeek,
  open: false,
  start: '10:00',
  end: '19:00',
  breaks: [],
});

function normalize(initial: SalonDayDTO[]): Map<number, SalonDayDTO> {
  const map = new Map<number, SalonDayDTO>();
  for (const { dayOfWeek } of DAYS) {
    const found = initial.find((d) => d.dayOfWeek === dayOfWeek);
    map.set(
      dayOfWeek,
      found
        ? {
            dayOfWeek,
            open: Boolean(found.open),
            start: found.start || '10:00',
            end: found.end || '19:00',
            breaks: (found.breaks ?? []).map((b) => ({ start: b.start, end: b.end })),
          }
        : DEFAULT_DAY(dayOfWeek),
    );
  }
  return map;
}

export type SalonHoursEditorProps = {
  initial: SalonDayDTO[];
};

export function SalonHoursEditor({ initial }: SalonHoursEditorProps) {
  const toast = useToast();
  const router = useRouter();
  const [week, setWeek] = useState<Map<number, SalonDayDTO>>(() => normalize(initial));
  const [saving, setSaving] = useState(false);

  const patchDay = (dayOfWeek: number, patch: Partial<SalonDayDTO>) =>
    setWeek((w) => {
      const next = new Map(w);
      next.set(dayOfWeek, { ...next.get(dayOfWeek)!, ...patch });
      return next;
    });

  const addBreak = (dayOfWeek: number) => {
    const day = week.get(dayOfWeek)!;
    patchDay(dayOfWeek, { breaks: [...day.breaks, { start: '13:00', end: '14:00' }] });
  };

  const removeBreak = (dayOfWeek: number, idx: number) => {
    const day = week.get(dayOfWeek)!;
    patchDay(dayOfWeek, { breaks: day.breaks.filter((_, i) => i !== idx) });
  };

  const patchBreak = (dayOfWeek: number, idx: number, patch: Partial<Break>) => {
    const day = week.get(dayOfWeek)!;
    patchDay(dayOfWeek, {
      breaks: day.breaks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    });
  };

  const save = async () => {
    // Validação leve; o servidor + modelo voltam a validar
    for (const { dayOfWeek, label } of DAYS) {
      const d = week.get(dayOfWeek)!;
      if (d.open && d.start >= d.end) {
        toast.error(`${label}: a abertura tem de ser antes do fecho`);
        return;
      }
      for (const b of d.breaks) {
        if (b.start >= b.end) {
          toast.error(`${label}: intervalo com horas inválidas`);
          return;
        }
      }
    }

    setSaving(true);
    const res = await setSalonWeekAction({
      week: DAYS.map(({ dayOfWeek }) => {
        const d = week.get(dayOfWeek)!;
        return {
          dayOfWeek,
          open: d.open,
          start: d.open ? d.start : undefined,
          end: d.open ? d.end : undefined,
          breaks: d.open ? d.breaks : [],
        };
      }),
    });
    setSaving(false);

    if (res.success) {
      toast.success('Horário do salão atualizado');
      router.refresh();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-3">
      {DAYS.map(({ dayOfWeek, label }) => {
        const day = week.get(dayOfWeek)!;
        return (
          <div
            key={dayOfWeek}
            className={cn(
              'rounded-md border p-3 transition-colors',
              day.open ? 'border-chi-border bg-white' : 'border-chi-border-light bg-chi-cream/30',
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-28">
                <Checkbox
                  checked={day.open}
                  onChange={(e) => patchDay(dayOfWeek, { open: e.target.checked })}
                  label={<span className="font-medium">{label}</span>}
                />
              </div>

              {day.open ? (
                <div className="flex flex-wrap items-center gap-2">
                  <TimePicker
                    value={day.start}
                    onChange={(e) => patchDay(dayOfWeek, { start: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-chi-charcoal-light">–</span>
                  <TimePicker
                    value={day.end}
                    onChange={(e) => patchDay(dayOfWeek, { end: e.target.value })}
                    className="w-32"
                  />
                  <Button variant="ghost" size="sm" onClick={() => addBreak(dayOfWeek)}>
                    <Plus size={14} />
                    Intervalo
                  </Button>
                </div>
              ) : (
                <span className="text-chi-charcoal-light text-sm">Encerrado</span>
              )}
            </div>

            {day.open && day.breaks.length > 0 && (
              <div className="border-chi-border-light mt-3 space-y-2 border-t pt-3 pl-1">
                {day.breaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-chi-charcoal-soft w-24 text-xs">Intervalo</span>
                    <TimePicker
                      value={b.start}
                      onChange={(e) => patchBreak(dayOfWeek, i, { start: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-chi-charcoal-light">–</span>
                    <TimePicker
                      value={b.end}
                      onChange={(e) => patchBreak(dayOfWeek, i, { end: e.target.value })}
                      className="w-28"
                    />
                    <button
                      type="button"
                      onClick={() => removeBreak(dayOfWeek, i)}
                      aria-label="Remover intervalo"
                      className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-1.5 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-end pt-1">
        <Button onClick={save} loading={saving}>
          Guardar horário do salão
        </Button>
      </div>
    </div>
  );
}
