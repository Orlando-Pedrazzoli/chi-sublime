// 📄 src/components/admin/services/ServicesTable.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Scissors, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  listServicesAction,
  getServiceAction,
  deleteServiceAction,
  listCategoriesAction,
} from '@/lib/server-actions/services';
import type { ServiceListItem, ServiceDetail, CategoryListItem } from '@/types/service';
import { ServiceForm } from './ServiceForm';

const PAGE_SIZE = 20;
type ActiveFilter = 'all' | 'active' | 'inactive';

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function ServicesTable() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [categoryId, setCategoryId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [items, setItems] = useState<ServiceListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceListItem | null>(null);
  const [busy, setBusy] = useState(false);

  // Categorias para o filtro (uma vez)
  useEffect(() => {
    (async () => {
      const res = await listCategoriesAction();
      if (res.success) setCategories(res.data);
    })();
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const input: Record<string, unknown> = {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      categoryId: categoryId || undefined,
    };
    if (activeFilter === 'active') input.active = true;
    if (activeFilter === 'inactive') input.active = false;

    const res = await listServicesAction(input);
    if (res.success) {
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [page, debouncedSearch, categoryId, activeFilter, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchServices();
  }, [fetchServices]);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = async (item: ServiceListItem) => {
    const res = await getServiceAction({ id: item.id });
    if (res.success) {
      setEditing(res.data);
      setFormOpen(true);
    } else {
      toast.error(res.error.message);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteServiceAction({ id: deleteTarget.id });
    setBusy(false);
    if (res.success) {
      toast.success('Serviço desativado');
      setDeleteTarget(null);
      fetchServices();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="text-chi-charcoal-light pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar serviço…"
              className={cn(
                'border-chi-border text-chi-charcoal h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm',
                'placeholder:text-chi-charcoal-light focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
              )}
            />
          </div>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="sm:w-52"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.pt}
              </option>
            ))}
          </Select>
          <Select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as ActiveFilter);
              setPage(1);
            }}
            className="sm:w-40"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </Select>
        </div>
        <Button onClick={handleNew} className="shrink-0">
          <Plus size={16} />
          Novo serviço
        </Button>
      </div>

      <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3 font-medium">Serviço</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 text-center font-medium">Duração</th>
                <th className="px-4 py-3 text-right font-medium">Preço</th>
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
                      icon={Scissors}
                      title="Sem serviços"
                      description={
                        debouncedSearch || categoryId
                          ? 'Nenhum serviço corresponde aos filtros.'
                          : 'Ainda não há serviços. Cria o primeiro.'
                      }
                      action={
                        !debouncedSearch && !categoryId ? (
                          <Button onClick={handleNew} size="sm">
                            <Plus size={16} />
                            Novo serviço
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((s) => (
                  <tr key={s.id} className="hover:bg-chi-sand/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-chi-charcoal font-medium">{s.name.pt}</span>
                        {s.popular && <Badge tone="gold">Popular</Badge>}
                      </div>
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3">{s.categoryName ?? '—'}</td>
                    <td className="text-chi-charcoal-soft px-4 py-3 text-center">
                      {s.duration} min
                    </td>
                    <td className="text-chi-charcoal px-4 py-3 text-right font-medium">
                      {money(s.priceWithVat)}
                      <span className="text-chi-charcoal-light ml-1 text-xs font-normal">
                        c/ IVA
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <Badge tone="success" dot>
                          Ativo
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          aria-label="Editar"
                          title="Editar"
                          className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          aria-label="Desativar"
                          title="Desativar"
                          className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-2 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
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
            {total} {total === 1 ? 'serviço' : 'serviços'}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <ServiceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        service={editing}
        onSaved={fetchServices}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Desativar serviço"
        description={deleteTarget?.name.pt}
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
          O serviço deixa de estar disponível para marcação, mas o histórico mantém-se. Podes
          reativá-lo depois.
        </p>
      </Modal>
    </div>
  );
}
