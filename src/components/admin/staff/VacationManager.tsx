// 📄 src/components/admin/staff/VacationManager.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { useToast } from '@/hooks/useToast';
import { setVacationsAction } from '@/lib/server-actions/staff';

type Period = { from: string; to: string; reason: string };

export type VacationManagerProps = {
  staffId: string;
  initial: Array<{ from: string; to: string; reason?: string }>;
  onSaved?: () => void;
};

function toRows(initial: VacationManagerProps['initial']): Period[] {
  return initial.map((v) => ({
    from: v.from ? v.from.slice(0, 10) : '',
    to: v.to ? v.to.slice(0, 10) : '',
    reason: v.reason ?? '',
  }));
}

export function VacationManager({ staffId, initial, onSaved }: VacationManagerProps) {
  const toast = useToast();
  const [rows, setRows] = useState<Period[]>(toRows(initial));
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((r) => [...r, { from: '', to: '', reason: '' }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Period, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const save = async () => {
    // Validação básica no cliente; o servidor volta a validar.
    for (const row of rows) {
      if (!row.from || !row.to) {
        toast.error('Preenche as datas de todos os períodos');
        return;
      }
      if (row.to < row.from) {
        toast.error('A data de fim não pode ser anterior à de início');
        return;
      }
    }

    setSaving(true);
    const res = await setVacationsAction({
      id: staffId,
      vacations: rows.map((r) => ({
        from: r.from,
        to: r.to,
        reason: r.reason.trim() || undefined,
      })),
    });
    setSaving(false);

    if (res.success) {
      toast.success('Férias atualizadas');
      onSaved?.();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="border-chi-border flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-center">
          <Palmtree size={22} className="text-chi-charcoal-light" />
          <p className="text-chi-charcoal-soft text-sm">Sem férias marcadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="border-chi-border-light grid grid-cols-1 items-end gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1.5fr_auto]"
            >
              <div>
                <label className="text-chi-charcoal-soft mb-1 block text-xs">De</label>
                <DatePicker value={row.from} onChange={(e) => update(i, 'from', e.target.value)} />
              </div>
              <div>
                <label className="text-chi-charcoal-soft mb-1 block text-xs">Até</label>
                <DatePicker value={row.to} onChange={(e) => update(i, 'to', e.target.value)} />
              </div>
              <div>
                <label className="text-chi-charcoal-soft mb-1 block text-xs">Motivo</label>
                <Input
                  value={row.reason}
                  onChange={(e) => update(i, 'reason', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remover"
                className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger mb-1 rounded-md p-2.5 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus size={16} />
          Adicionar período
        </Button>
        <Button onClick={save} loading={saving}>
          Guardar férias
        </Button>
      </div>
    </div>
  );
}
