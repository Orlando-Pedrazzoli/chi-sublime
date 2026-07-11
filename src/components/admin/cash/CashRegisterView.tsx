// 📄 src/components/admin/cash/CashRegisterView.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, Unlock, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import { eurosToCents } from '@/lib/utils/cents';
import {
  getCashRegisterAction,
  openCashRegisterAction,
  closeCashRegisterAction,
  listCashRegistersAction,
} from '@/lib/server-actions/cash-register';
import type {
  CashRegisterDTO,
  CashRegisterListItem,
  PaymentBreakdown,
} from '@/lib/server-actions/cash-register';

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function parseEuros(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
}
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

const METHODS: { key: keyof PaymentBreakdown; label: string }[] = [
  { key: 'cash', label: 'Numerário' },
  { key: 'card_terminal', label: 'Cartão' },
  { key: 'mb_way', label: 'MB WAY' },
  { key: 'multibanco', label: 'Multibanco' },
  { key: 'transfer', label: 'Transferência' },
  { key: 'other', label: 'Outro' },
];

export function CashRegisterView() {
  const toast = useToast();

  const [dto, setDto] = useState<CashRegisterDTO | null>(null);
  const [history, setHistory] = useState<CashRegisterListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [openingEuros, setOpeningEuros] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);

  const [countedEuros, setCountedEuros] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [reason, setReason] = useState('');
  const [closingBusy, setClosingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const date = todayISO();
    const [reg, list] = await Promise.all([
      getCashRegisterAction({ date }),
      listCashRegistersAction({ page: 1, pageSize: 10 }),
    ]);
    if (reg.success) setDto(reg.data);
    else toast.error(reg.error.message);
    if (list.success) setHistory(list.data.items);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openRegister = async () => {
    setOpeningBusy(true);
    const res = await openCashRegisterAction({
      date: todayISO(),
      openingCash: eurosToCents(parseEuros(openingEuros)),
    });
    setOpeningBusy(false);
    if (res.success) {
      toast.success('Caixa aberta');
      setOpeningEuros('');
      load();
    } else {
      toast.error(res.error.message);
    }
  };

  const countedCents = eurosToCents(parseEuros(countedEuros));
  const expected = dto?.expectedCash ?? 0;
  const diff = countedCents - expected; // + sobra | − falta
  const needsReason = diff !== 0;

  const handleClose = async () => {
    if (!dto) return;
    if (!revealed) {
      setRevealed(true); // blind close: só revela o esperado depois de contar
      return;
    }
    if (needsReason && !reason.trim()) {
      toast.error('Indica o motivo da diferença');
      return;
    }
    setClosingBusy(true);
    const res = await closeCashRegisterAction({
      date: dto.date.slice(0, 10),
      closingCash: countedCents,
      differenceReason: reason.trim() || undefined,
    });
    setClosingBusy(false);
    if (res.success) {
      toast.success('Caixa fechada');
      setRevealed(false);
      setCountedEuros('');
      setReason('');
      load();
    } else {
      toast.error(res.error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Caixa de hoje ---- */}
      {!dto?.exists ? (
        <OpenCard
          value={openingEuros}
          onChange={setOpeningEuros}
          onOpen={openRegister}
          busy={openingBusy}
        />
      ) : dto.closed ? (
        <ClosedCard dto={dto} />
      ) : (
        <div className="border-chi-border space-y-5 rounded-lg border bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Unlock size={18} className="text-chi-success" />
              <h2 className="text-chi-green-darker font-serif text-xl">Caixa aberta</h2>
              <Badge tone="success" dot>
                Hoje
              </Badge>
            </div>
            <span className="text-chi-charcoal-soft text-sm">Fundo: {money(dto.openingCash)}</span>
          </div>

          {/* Resumo do dia */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={TrendingUp}
              label="Entradas"
              value={money(dto.totalIncome)}
              tone="green"
            />
            <SummaryCard
              icon={TrendingDown}
              label="Saídas"
              value={money(dto.totalExpense)}
              tone="red"
            />
            <SummaryCard icon={Wallet} label="Resultado" value={money(dto.netProfit)} tone="gold" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Breakdown title="Entradas por método" data={dto.incomeByPaymentMethod} />
            <Breakdown title="Saídas por método" data={dto.expenseByPaymentMethod} />
          </div>

          {/* Fecho (blind) */}
          <div className="border-chi-border-light bg-chi-cream/40 space-y-3 rounded-md border p-4">
            <div className="text-chi-green-deep flex items-center gap-2">
              <Lock size={15} />
              <span className="text-sm font-medium">Fechar caixa</span>
            </div>

            <div className="max-w-xs">
              <Label>Dinheiro contado (€)</Label>
              <Input
                inputMode="decimal"
                value={countedEuros}
                onChange={(e) => {
                  setCountedEuros(e.target.value);
                  setRevealed(false);
                }}
                placeholder="0,00"
              />
              <p className="text-chi-charcoal-light mt-1 text-xs">
                Conta o numerário em caixa antes de ver o valor esperado.
              </p>
            </div>

            {revealed && (
              <div className="border-chi-border-light space-y-3 border-t pt-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat label="Esperado" value={money(expected)} />
                  <Stat label="Contado" value={money(countedCents)} />
                  <Stat
                    label={diff === 0 ? 'Diferença' : diff > 0 ? 'Sobra' : 'Falta'}
                    value={money(Math.abs(diff))}
                    tone={diff === 0 ? 'ok' : 'bad'}
                  />
                </div>
                {needsReason && (
                  <div>
                    <Label required>Motivo da diferença</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleClose} loading={closingBusy} disabled={!countedEuros.trim()}>
                {revealed ? 'Confirmar fecho' : 'Fechar caixa'}
              </Button>
              {revealed && (
                <button
                  type="button"
                  onClick={() => setRevealed(false)}
                  className="text-chi-charcoal-soft text-sm underline-offset-2 hover:underline"
                >
                  Recontar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Histórico ---- */}
      {history.length > 0 && (
        <div>
          <h3 className="text-chi-green-darker mb-2 font-serif text-lg">Histórico</h3>
          <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                    <th className="px-4 py-3 font-medium">Dia</th>
                    <th className="px-4 py-3 text-right font-medium">Entradas</th>
                    <th className="px-4 py-3 text-right font-medium">Saídas</th>
                    <th className="px-4 py-3 text-right font-medium">Diferença</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-chi-border-light divide-y">
                  {history.map((r) => (
                    <tr key={r.id} className="hover:bg-chi-sand/40">
                      <td className="text-chi-charcoal px-4 py-3">{fmtDate(r.date)}</td>
                      <td className="text-chi-charcoal-soft px-4 py-3 text-right">
                        {money(r.totalIncome)}
                      </td>
                      <td className="text-chi-charcoal-soft px-4 py-3 text-right">
                        {money(r.totalExpense)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium',
                          r.difference === 0 ? 'text-chi-charcoal' : 'text-chi-danger',
                        )}
                      >
                        {r.difference === 0 ? '—' : money(r.difference)}
                      </td>
                      <td className="px-4 py-3">
                        {r.closed ? (
                          <Badge tone="neutral" dot>
                            Fechada
                          </Badge>
                        ) : (
                          <Badge tone="success" dot>
                            Aberta
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function OpenCard({
  value,
  onChange,
  onOpen,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onOpen: () => void;
  busy: boolean;
}) {
  return (
    <div className="border-chi-border rounded-lg border bg-white p-6 text-center">
      <div className="bg-chi-sand mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <Lock size={22} className="text-chi-charcoal-soft" />
      </div>
      <h2 className="text-chi-green-darker font-serif text-xl">Caixa fechada</h2>
      <p className="text-chi-charcoal-soft mt-1 text-sm">
        Abre a caixa com o fundo inicial para começar o dia.
      </p>
      <div className="mx-auto mt-4 max-w-xs text-left">
        <Label>Fundo de abertura (€)</Label>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
        />
      </div>
      <Button onClick={onOpen} loading={busy} className="mt-4">
        <Unlock size={16} />
        Abrir caixa
      </Button>
    </div>
  );
}

function ClosedCard({ dto }: { dto: CashRegisterDTO }) {
  const diff = dto.difference;
  return (
    <div className="border-chi-border space-y-4 rounded-lg border bg-white p-5">
      <div className="flex items-center gap-2">
        <Lock size={18} className="text-chi-charcoal-soft" />
        <h2 className="text-chi-green-darker font-serif text-xl">Caixa fechada</h2>
        <Badge tone="neutral" dot>
          {fmtDate(dto.date)}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fundo" value={money(dto.openingCash)} />
        <Stat label="Esperado" value={money(dto.expectedCash)} />
        <Stat label="Contado" value={money(dto.closingCash)} />
        <Stat
          label={diff === 0 ? 'Diferença' : diff > 0 ? 'Sobra' : 'Falta'}
          value={money(Math.abs(diff))}
          tone={diff === 0 ? 'ok' : 'bad'}
        />
      </div>
      {dto.differenceReason && (
        <p className="bg-chi-cream/60 text-chi-charcoal-soft rounded-md p-3 text-sm">
          <span className="font-medium">Motivo:</span> {dto.differenceReason}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
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
    <div className="border-chi-border-light bg-chi-cream/40 rounded-md border p-3">
      <div className="text-chi-charcoal-soft flex items-center gap-1.5 text-xs uppercase">
        <Icon size={13} className={color} />
        {label}
      </div>
      <p className={cn('mt-1 text-lg font-semibold', color)}>{value}</p>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: PaymentBreakdown }) {
  return (
    <div className="border-chi-border-light rounded-md border">
      <p className="border-chi-border-light text-chi-charcoal-soft border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <div className="divide-chi-border-light divide-y">
        {METHODS.map(({ key, label }) => (
          <div key={key} className="flex justify-between px-3 py-1.5 text-sm">
            <span className="text-chi-charcoal-soft">{label}</span>
            <span
              className={cn(
                'tabular-nums',
                data[key] ? 'text-chi-charcoal' : 'text-chi-charcoal-light',
              )}
            >
              {money(data[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="bg-chi-cream/50 rounded-md px-3 py-2">
      <p className="text-chi-charcoal-soft text-xs">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-semibold tabular-nums',
          tone === 'bad'
            ? 'text-chi-danger'
            : tone === 'ok'
              ? 'text-chi-success'
              : 'text-chi-charcoal',
        )}
      >
        {value}
      </p>
    </div>
  );
}
