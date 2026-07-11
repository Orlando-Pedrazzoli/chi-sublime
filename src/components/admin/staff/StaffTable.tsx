// 📄 src/components/admin/staff/StaffTable.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Users, Search, SlidersHorizontal } from 'lucide-react';
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
import { listStaffAction, getStaffAction, deleteStaffAction } from '@/lib/server-actions/staff';
import type { StaffListItem, StaffDetail } from '@/types/staff';
import { StaffForm } from './StaffForm';

const PAGE_SIZE = 20;
type ActiveFilter = 'all' | 'active' | 'inactive';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function StaffTable() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<StaffListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const input: Record<string, unknown> = {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
    };
    if (activeFilter === 'active') input.active = true;
    if (activeFilter === 'inactive') input.active = false;

    const res = await listStaffAction(input);
    if (res.success) {
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } else {
      toast.error(res.error.message);
    }
    setLoading(false);
  }, [page, debouncedSearch, activeFilter, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
  }, [fetchStaff]);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEditProfile = async (item: StaffListItem) => {
    const res = await getStaffAction({ id: item.id });
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
    const res = await deleteStaffAction({ id: deleteTarget.id });
    setBusy(false);
    if (res.success) {
      toast.success('Membro desativado');
      setDeleteTarget(null);
      fetchStaff();
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
              placeholder="Pesquisar membro…"
              className={cn(
                'border-chi-border text-chi-charcoal h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm',
                'placeholder:text-chi-charcoal-light focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
              )}
            />
          </div>
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
          Novo membro
        </Button>
      </div>

      <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3 font-medium">Membro</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-chi-border-light divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="p-0">
                      <SkeletonRow cols={3} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={Users}
                      title="Sem membros"
                      description={
                        debouncedSearch
                          ? 'Nenhum membro corresponde à pesquisa.'
                          : 'Ainda não há equipa. Adiciona o primeiro membro.'
                      }
                      action={
                        !debouncedSearch ? (
                          <Button onClick={handleNew} size="sm">
                            <Plus size={16} />
                            Novo membro
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-chi-sand/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/equipa/${m.id}`}
                        className="group flex items-center gap-3"
                      >
                        {m.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.photo}
                            alt={m.name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="bg-chi-green-deep text-chi-cream flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium">
                            {initials(m.name)}
                          </span>
                        )}
                        <div>
                          <span className="text-chi-charcoal group-hover:text-chi-green-deep font-medium">
                            {m.name}
                          </span>
                          {m.specialties.length > 0 && (
                            <div className="text-chi-charcoal-light text-xs">
                              {m.specialties.slice(0, 3).join(' · ')}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3">{m.role.pt}</td>
                    <td className="px-4 py-3">
                      {m.active ? (
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
                        <Link
                          href={`/admin/equipa/${m.id}`}
                          aria-label="Gerir horário e férias"
                          title="Gerir horário e férias"
                          className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2.5 transition-colors"
                        >
                          <SlidersHorizontal size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEditProfile(m)}
                          aria-label="Editar perfil"
                          title="Editar perfil"
                          className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2.5 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          aria-label="Desativar"
                          title="Desativar"
                          className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-2.5 transition-colors"
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
            {total} {total === 1 ? 'membro' : 'membros'}
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <StaffForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        staff={editing}
        onSaved={fetchStaff}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Desativar membro"
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
          O membro deixa de aparecer nas marcações, mas o histórico mantém-se. Podes reativá-lo
          depois.
        </p>
      </Modal>
    </div>
  );
}
