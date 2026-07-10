// 📄 src/components/admin/staff/WorkingHoursEditor.tsx
'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { TimePicker } from '@/components/ui/TimePicker';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import { setWorkingHoursAction } from '@/lib/server-actions/staff';
import type { WorkingHoursDTO } from '@/types/staff';

type WeekDay = keyof WorkingHoursDTO;
type Break = { start: string; end: string };
type DayConfig = { enabled: boolean; start: string; end: string; breaks: Break[] };

const DAYS: { key: WeekDay; label: string }[] = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const DEFAULT_DAY: DayConfig = { enabled: false, start: '10:00', end: '19:00', breaks: [] };

function normalize(initial: WorkingHoursDTO | undefined): WorkingHoursDTO {
  const out = {} as WorkingHoursDTO;
  for (const { key } of DAYS) {
    const d = initial?.[key];
    out[key] = d
      ? {
          enabled: Boolean(d.enabled),
          start: d.start ?? '10:00',
          end: d.end ?? '19:00',
          breaks: (d.breaks ?? []).map((b) => ({ start: b.start, end: b.end })),
        }
      : { ...DEFAULT_DAY };
  }
  return out;
}

export type WorkingHoursEditorProps = {
  staffId: string;
  initial?: WorkingHoursDTO;
  onSaved?: () => void;
};

export function WorkingHoursEditor({ staffId, initial, onSaved }: WorkingHoursEditorProps) {
  const toast = useToast();
  const [hours, setHours] = useState<WorkingHoursDTO>(() => normalize(initial));
  const [saving, setSaving] = useState(false);

  const patchDay = (day: WeekDay, patch: Partial<DayConfig>) =>
    setHours((h) => ({ ...h, [day]: { ...h[day], ...patch } }));

  const addBreak = (day: WeekDay) =>
    setHours((h) => ({
      ...h,
      [day]: { ...h[day], breaks: [...h[day].breaks, { start: '13:00', end: '14:00' }] },
    }));

  const removeBreak = (day: WeekDay, idx: number) =>
    setHours((h) => ({
      ...h,
      [day]: { ...h[day], breaks: h[day].breaks.filter((_, i) => i !== idx) },
    }));

  const patchBreak = (day: WeekDay, idx: number, patch: Partial<Break>) =>
    setHours((h) => ({
      ...h,
      [day]: {
        ...h[day],
        breaks: h[day].breaks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
      },
    }));

  const save = async () => {
    // Validação leve; o servidor volta a validar (abertura < fecho, etc.)
    for (const { key, label } of DAYS) {
      const d = hours[key];
      if (d.enabled && d.start >= d.end) {
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
    const res = await setWorkingHoursAction({ id: staffId, workingHours: hours });
    setSaving(false);
    if (res.success) {
      toast.success('Horário atualizado');
      onSaved?.();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const day = hours[key];
        return (
          <div
            key={key}
            className={cn(
              'rounded-md border p-3 transition-colors',
              day.enabled
                ? 'border-chi-border bg-white'
                : 'border-chi-border-light bg-chi-cream/30',
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-28">
                <Checkbox
                  checked={day.enabled}
                  onChange={(e) => patchDay(key, { enabled: e.target.checked })}
                  label={<span className="font-medium">{label}</span>}
                />
              </div>

              {day.enabled ? (
                <div className="flex flex-wrap items-center gap-2">
                  <TimePicker
                    value={day.start}
                    onChange={(e) => patchDay(key, { start: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-chi-charcoal-light">–</span>
                  <TimePicker
                    value={day.end}
                    onChange={(e) => patchDay(key, { end: e.target.value })}
                    className="w-32"
                  />
                  <Button variant="ghost" size="sm" onClick={() => addBreak(key)}>
                    <Plus size={14} />
                    Intervalo
                  </Button>
                </div>
              ) : (
                <span className="text-chi-charcoal-light text-sm">Fechado</span>
              )}
            </div>

            {day.enabled && day.breaks.length > 0 && (
              <div className="border-chi-border-light mt-3 space-y-2 border-t pt-3 pl-1">
                {day.breaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-chi-charcoal-soft w-24 text-xs">Intervalo</span>
                    <TimePicker
                      value={b.start}
                      onChange={(e) => patchBreak(key, i, { start: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-chi-charcoal-light">–</span>
                    <TimePicker
                      value={b.end}
                      onChange={(e) => patchBreak(key, i, { end: e.target.value })}
                      className="w-28"
                    />
                    <button
                      type="button"
                      onClick={() => removeBreak(key, i)}
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
          Guardar horário
        </Button>
      </div>
    </div>
  );
}
