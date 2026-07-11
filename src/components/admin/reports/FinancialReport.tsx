// 📄 src/components/admin/reports/FinancialReport.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import { getFinancialReportAction, type FinancialReportDTO } from '@/lib/server-actions/reports';

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
type Preset = 'month' | 'lastMonth' | 'year' | 'custom';
function rangeFor(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  if (preset === 'year') {
    return {
      from: iso(new Date(now.getFullYear(), 0, 1)),
      to: iso(new Date(now.getFullYear(), 11, 31)),
    };
  }
  const off = preset === 'lastMonth' ? -1 : 0;
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth() + off, 1)),
    to: iso(new Date(now.getFullYear(), now.getMonth() + off + 1, 0)),
  };
}

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'month', label: 'Este mês' },
  { id: 'lastMonth', label: 'Mês passado' },
  { id: 'year', label: 'Este ano' },
];

export function FinancialReport() {
  const toast = useToast();
  const initial = rangeFor('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<Preset>('month');
  const [data, setData] = useState<FinancialReportDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await getFinancialReportAction({ from, to });
    if (res.success) setData(res.data);
    else toast.error(res.error.message);
    setLoading(false);
  }, [from, to, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport();
  }, [fetchReport]);

  const applyPreset = (p: Exclude<Preset, 'custom'>) => {
    const r = rangeFor(p);
    setFrom(r.from);
    setTo(r.to);
    setPreset(p);
  };

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="border-chi-border flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  preset === p.id
                    ? 'bg-chi-green-deep text-chi-cream'
                    : 'bg-chi-sand text-chi-charcoal-soft hover:bg-chi-sand-deep',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('custom');
              }}
              className="sm:w-40"
            />
            <span className="text-chi-charcoal-light">–</span>
            <DatePicker
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('custom');
              }}
              className="sm:w-40"
            />
          </div>
        </div>

        <a
          href={`/api/pdf/financial?from=${from}&to=${to}`}
          className="bg-chi-gold text-chi-green-darker hover:bg-chi-gold-deep inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors hover:text-white"
        >
          <Download size={16} />
          Descarregar PDF
        </a>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : data ? (
        <>
          <p className="text-chi-charcoal-light text-xs">Período: {data.periodLabel}</p>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={TrendingUp} label="Receita" value={money(data.totalIncome)} tone="green" />
            <Kpi icon={TrendingDown} label="Despesa" value={money(data.totalExpense)} tone="red" />
            <Kpi
              icon={Wallet}
              label="Resultado"
              value={money(data.net)}
              tone={data.net >= 0 ? 'green' : 'red'}
            />
            <Kpi
              icon={Receipt}
              label="IVA a entregar"
              value={money(data.vatCollected - data.vatPaid)}
              tone="gold"
            />
          </div>

          {/* Detalhe por categoria */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryTable
              title="Receita por categoria"
              rows={data.incomeByCategory}
              tone="green"
            />
            <CategoryTable title="Despesa por categoria" rows={data.expenseByCategory} tone="red" />
          </div>

          {/* IVA */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="IVA liquidado (vendas)" value={money(data.vatCollected)} />
            <MiniStat label="IVA suportado (compras)" value={money(data.vatPaid)} />
            <MiniStat
              label="IVA a entregar"
              value={money(data.vatCollected - data.vatPaid)}
              strong
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone: 'green' | 'red' | 'gold';
}) {
  const color =
    tone === 'green'
      ? 'text-chi-success'
      : tone === 'red'
        ? 'text-chi-danger'
        : 'text-chi-gold-deep';
  return (
    <div className="border-chi-border rounded-lg border bg-white p-4">
      <div className="text-chi-charcoal-soft flex items-center gap-1.5 text-xs tracking-wide uppercase">
        <Icon size={13} className={color} />
        {label}
      </div>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums', color)}>{value}</p>
    </div>
  );
}

function CategoryTable({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { name: string; amount: number }[];
  tone: 'green' | 'red';
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  const bar = tone === 'green' ? 'bg-chi-success/25' : 'bg-chi-danger/20';
  return (
    <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
      <p className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b px-4 py-2.5 text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-chi-charcoal-light px-4 py-6 text-center text-sm">Sem movimentos.</p>
      ) : (
        <div className="divide-chi-border-light divide-y">
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`} className="relative px-4 py-2.5">
              <div
                className={cn('absolute inset-y-0 left-0', bar)}
                style={{ width: `${(r.amount / max) * 100}%` }}
                aria-hidden
              />
              <div className="relative flex justify-between text-sm">
                <span className="text-chi-charcoal">{r.name}</span>
                <span className="text-chi-charcoal font-medium tabular-nums">
                  {money(r.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border-chi-border-light bg-chi-cream/40 rounded-md border p-3">
      <p className="text-chi-charcoal-soft text-xs">{label}</p>
      <p
        className={cn(
          'mt-0.5 tabular-nums',
          strong
            ? 'text-chi-green-deep text-lg font-semibold'
            : 'text-chi-charcoal text-base font-medium',
        )}
      >
        {value}
      </p>
    </div>
  );
}
