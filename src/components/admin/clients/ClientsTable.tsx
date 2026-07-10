// 📄 src/components/admin/clients/ClientsTable.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Lock, Unlock, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  listClientsAction,
  setClientBlockAction,
  deleteClientAction,
  getClientAction,
} from '@/lib/server-actions/clients';
import type { ClientListItem, ClientDetail } from '@/types/client';
import { ClientFilters, type ClientStatusFilter, type ClientSort } from './ClientFilters';
import { ClientForm } from './ClientForm';

const PAGE_SIZE = 20;

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ClientsTable() {
  const toast = useToast();

  // Filtros / pesquisa / paginação
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState<ClientStatusFilter>('all');
  const [sort, setSort] = useState<ClientSort>('recent');
  const [page, setPage] = useState(1);

  // Dados
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form (criar/editar)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientDetail | null>(null);

  // Modais de confirmação
  const [blockTarget, setBlockTarget] = useState<ClientListItem | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ClientListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const input: Record<string, unknown> = {
      page,
      pageSize: PAGE_SIZE,
      sort,
      search: debouncedSearch || undefined,
    };
    if (status === 'active') input.active = true;
    if (status === 'blocked') input.blocked = true;

    const res = await listClientsAction(input);
    if (res.success) {
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [page, debouncedSearch, sort, status, toast]);

  useEffect(() => {
    // Data-fetch reativo a filtros/página — o setState dentro do fetch é intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClients();
  }, [fetchClients]);

  // Handlers de filtro (repõem a página)
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatus = (v: ClientStatusFilter) => {
    setStatus(v);
    setPage(1);
  };
  const onSort = (v: ClientSort) => {
    setSort(v);
    setPage(1);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = async (item: ClientListItem) => {
    const res = await getClientAction({ id: item.id });
    if (res.success) {
      setEditing(res.data);
      setFormOpen(true);
    } else {
      toast.error(res.error.message);
    }
  };

  const handleUnblock = async (item: ClientListItem) => {
    const res = await setClientBlockAction({ id: item.id, blocked: false });
    if (res.success) {
      toast.success('Cliente desbloqueado');
      fetchClients();
    } else {
      toast.error(res.error.message);
    }
  };

  const confirmBlock = async () => {
    if (!blockTarget) return;
    setBusy(true);
    const res = await setClientBlockAction({
      id: blockTarget.id,
      blocked: true,
      reason: blockReason.trim(),
    });
    setBusy(false);
    if (res.success) {
      toast.success('Cliente bloqueado');
      setBlockTarget(null);
      setBlockReason('');
      fetchClients();
    } else {
      toast.error(res.error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteClientAction({ id: deleteTarget.id });
    setBusy(false);
    if (res.success) {
      toast.success('Cliente desativado');
      setDeleteTarget(null);
      fetchClients();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClientFilters
          search={search}
          onSearch={onSearch}
          status={status}
          onStatus={onStatus}
          sort={sort}
          onSort={onSort}
          className="flex-1"
        />
        <Button onClick={handleNew} className="shrink-0">
          <Plus size={16} />
          Novo cliente
        </Button>
      </div>

      <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 text-right font-medium">Gasto</th>
                <th className="px-4 py-3 text-center font-medium">Visitas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-chi-border-light divide-y">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="p-0">
                      <SkeletonRow cols={5} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="Sem clientes"
                      description={
                        debouncedSearch
                          ? 'Nenhum cliente corresponde à pesquisa.'
                          : 'Ainda não há clientes. Cria o primeiro.'
                      }
                      action={
                        !debouncedSearch ? (
                          <Button onClick={handleNew} size="sm">
                            <Plus size={16} />
                            Novo cliente
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-chi-sand/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-chi-charcoal font-medium">{c.name}</span>
                        {c.isVip && <Badge tone="gold">VIP</Badge>}
                      </div>
                      {c.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-chi-charcoal-light text-xs">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-chi-charcoal-light text-xs">{c.email}</div>}
                    </td>
                    <td className="text-chi-charcoal px-4 py-3 text-right font-medium">
                      {money(c.totalSpent)}
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3 text-center">{c.visitCount}</td>
                    <td className="px-4 py-3">
                      {c.blocked ? (
                        <Badge tone="danger" dot>
                          Bloqueado
                        </Badge>
                      ) : (
                        <Badge tone="success" dot>
                          Ativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="Editar" onClick={() => handleEdit(c)}>
                          <Pencil size={16} />
                        </IconButton>
                        {c.blocked ? (
                          <IconButton label="Desbloquear" onClick={() => handleUnblock(c)}>
                            <Unlock size={16} />
                          </IconButton>
                        ) : (
                          <IconButton label="Bloquear" onClick={() => setBlockTarget(c)}>
                            <Lock size={16} />
                          </IconButton>
                        )}
                        <IconButton label="Desativar" danger onClick={() => setDeleteTarget(c)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-chi-charcoal-soft text-xs">
            {total} {total === 1 ? 'cliente' : 'clientes'}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Criar / Editar */}
      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        client={editing}
        onSaved={fetchClients}
      />

      {/* Bloquear */}
      <Modal
        open={!!blockTarget}
        onClose={() => !busy && setBlockTarget(null)}
        title="Bloquear cliente"
        description={blockTarget?.name}
        size="sm"
        dismissable={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => setBlockTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={confirmBlock}
              loading={busy}
              disabled={!blockReason.trim()}
            >
              Bloquear
            </Button>
          </>
        }
      >
        <p className="text-chi-charcoal-soft mb-3 text-sm">
          Indica o motivo do bloqueio (obrigatório). O cliente deixa de poder marcar.
        </p>
        <Textarea
          value={blockReason}
          onChange={(e) => setBlockReason(e.target.value)}
          rows={3}
          placeholder="Ex: faltas repetidas sem aviso"
        />
      </Modal>

      {/* Desativar */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Desativar cliente"
        description={deleteTarget?.name}
        size="sm"
        dismissable={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              Desativar
            </Button>
          </>
        }
      >
        <p className="text-chi-charcoal-soft text-sm">
          O cliente deixa de aparecer nas listas, mas o histórico (reservas e transações) mantém-se.
          Podes reativá-lo depois.
        </p>
      </Modal>
    </div>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        danger
          ? 'text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-2 transition-colors'
          : 'text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2 transition-colors'
      }
    >
      {children}
    </button>
  );
}
