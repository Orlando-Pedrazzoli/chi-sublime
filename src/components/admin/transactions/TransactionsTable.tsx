// 📄 src/components/admin/transactions/TransactionsTable.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Undo2, Receipt, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  listTransactionsAction,
  getTransactionAction,
  refundTransactionAction,
  listIncomeCategoriesAction,
  listExpenseCategoriesAction,
} from '@/lib/server-actions/transactions';
import type { TransactionListItem, TransactionDetail } from '@/types/transaction';
import { TransactionFilters, EMPTY_TX_FILTERS, type TxFilters } from './TransactionFilters';

const PAGE_SIZE = 20;

const METHOD_LABELS: Record<string, string> = {
  cash: 'Numerário',
  card_terminal: 'Terminal',
  mb_way: 'MB WAY',
  multibanco: 'Multibanco',
  transfer: 'Transferência',
  other: 'Outro',
};

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }> =
  {
    completed: { label: 'Concluída', tone: 'success' },
    refunded: { label: 'Reembolsada', tone: 'warning' },
    pending: { label: 'Pendente', tone: 'info' },
    cancelled: { label: 'Cancelada', tone: 'neutral' },
  };

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export type TransactionsTableProps = {
  type: 'income' | 'expense';
  reloadSignal?: number;
  headerAction?: React.ReactNode;
};

export function TransactionsTable({
  type,
  reloadSignal = 0,
  headerAction,
}: TransactionsTableProps) {
  const toast = useToast();

  const [filters, setFilters] = useState<TxFilters>(EMPTY_TX_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 350);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);

  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [refundTarget, setRefundTarget] = useState<TransactionListItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState(false);

  const patchFilters = (patch: Partial<TxFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  // Categorias (para o filtro), por tipo
  useEffect(() => {
    (async () => {
      const res =
        type === 'income'
          ? await listIncomeCategoriesAction()
          : await listExpenseCategoriesAction();
      if (res.success) setCategoryOptions(res.data.map((c) => ({ value: c.id, label: c.name })));
    })();
  }, [type]);

  const fetchTx = useCallback(async () => {
    setLoading(true);
    const input: Record<string, unknown> = {
      type,
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: filters.status || undefined,
      paymentMethod: filters.method || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    };
    if (filters.category) {
      input[type === 'income' ? 'incomeCategoryId' : 'expenseCategoryId'] = filters.category;
    }
    const res = await listTransactionsAction(input);
    if (res.success) {
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [
    type,
    page,
    debouncedSearch,
    filters.status,
    filters.method,
    filters.from,
    filters.to,
    filters.category,
    toast,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTx();
  }, [fetchTx, reloadSignal]);

  const openDetail = async (item: TransactionListItem) => {
    const res = await getTransactionAction({ id: item.id });
    if (res.success) setDetail(res.data);
    else toast.error(res.error.message);
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;
    setBusy(true);
    const res = await refundTransactionAction({
      id: refundTarget.id,
      reason: refundReason.trim() || undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success('Transação reembolsada');
      setRefundTarget(null);
      setRefundReason('');
      fetchTx();
    } else {
      toast.error(res.error.message);
    }
  };

  const noun = type === 'income' ? 'receita' : 'despesa';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <TransactionFilters
          filters={filters}
          onChange={patchFilters}
          categoryOptions={categoryOptions}
          className="flex-1"
        />
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-chi-border-light divide-y">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-0">
                      <SkeletonRow cols={6} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Receipt}
                      title={`Sem ${noun}s`}
                      description="Nenhum movimento corresponde aos filtros."
                    />
                  </td>
                </tr>
              ) : (
                items.map((t) => {
                  const st = STATUS[t.status] ?? STATUS.completed;
                  return (
                    <tr key={t.id} className="hover:bg-chi-sand/40 transition-colors">
                      <td className="text-chi-charcoal-soft px-4 py-3 font-mono text-xs">
                        {t.transactionNumber}
                      </td>
                      <td className="text-chi-charcoal-soft px-4 py-3">{fmtDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <div className="text-chi-charcoal">{t.categoryName ?? '—'}</div>
                        {t.description && (
                          <div className="text-chi-charcoal-light text-xs">{t.description}</div>
                        )}
                      </td>
                      <td className="text-chi-charcoal-soft px-4 py-3">
                        {METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod}
                      </td>
                      <td className="text-chi-charcoal px-4 py-3 text-right font-medium">
                        {money(t.totalWithVat)}
                        {t.invoiceIssued && (
                          <FileText
                            size={12}
                            className="text-chi-success ml-1 inline"
                            aria-label="Faturado"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={st.tone} dot>
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetail(t)}
                            aria-label="Ver detalhe"
                            title="Ver detalhe"
                            className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2 transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          {t.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => setRefundTarget(t)}
                              aria-label="Reembolsar"
                              title="Reembolsar / anular"
                              className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-2 transition-colors"
                            >
                              <Undo2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-chi-charcoal-soft text-xs">
            {total} {total === 1 ? noun : `${noun}s`}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Detalhe */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.transactionNumber}
        description={detail ? fmtDate(detail.date) : undefined}
        size="md"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            {detail.services.length > 0 && (
              <div className="border-chi-border-light rounded-md border">
                {detail.services.map((s, i) => (
                  <div
                    key={i}
                    className="text-chi-charcoal-soft [&:not(:last-child)]:border-chi-border-light flex justify-between px-3 py-2 [&:not(:last-child)]:border-b"
                  >
                    <span>
                      {s.name} {s.quantity > 1 && `× ${s.quantity}`}
                      {s.discount > 0 && (
                        <span className="text-chi-charcoal-light"> (−{s.discount}%)</span>
                      )}
                    </span>
                    <span>{money(s.price * s.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
            <dl className="space-y-1.5">
              <Row label="Categoria" value={detail.categoryName ?? '—'} />
              {detail.supplier && <Row label="Fornecedor" value={detail.supplier} />}
              <Row label="Líquido" value={money(detail.amount)} />
              <Row label={`IVA (${detail.vatRate}%)`} value={money(detail.vatAmount)} />
              {detail.tipAmount > 0 && <Row label="Gorjeta" value={money(detail.tipAmount)} />}
              <Row label="Total" value={money(detail.totalWithVat)} strong />
              <Row
                label="Método"
                value={METHOD_LABELS[detail.paymentMethod] ?? detail.paymentMethod}
              />
              <Row
                label="Fatura"
                value={
                  detail.invoiceIssued
                    ? 'Emitida'
                    : detail.invoiceRequested
                      ? 'Pedida'
                      : 'Não emitida'
                }
              />
            </dl>
            {detail.notes && (
              <p className="bg-chi-cream/60 text-chi-charcoal-soft rounded-md p-3 text-xs">
                {detail.notes}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Reembolso */}
      <Modal
        open={!!refundTarget}
        onClose={() => !busy && setRefundTarget(null)}
        title="Reembolsar transação"
        description={refundTarget?.transactionNumber}
        size="sm"
        dismissable={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => setRefundTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmRefund} loading={busy}>
              Reembolsar
            </Button>
          </>
        }
      >
        <p className="text-chi-charcoal-soft mb-3 text-sm">
          A transação passa a <strong>reembolsada</strong> e deixa de contar nos totais e no caixa.
          Esta ação não se pode desfazer.
        </p>
        <Textarea
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          rows={2}
          placeholder="Motivo (opcional)"
        />
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-chi-charcoal-soft">{label}</dt>
      <dd className={strong ? 'text-chi-charcoal font-semibold' : 'text-chi-charcoal'}>{value}</dd>
    </div>
  );
}
