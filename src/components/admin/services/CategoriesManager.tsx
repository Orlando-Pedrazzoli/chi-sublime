// 📄 src/components/admin/services/CategoriesManager.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { listCategoriesAction, deleteCategoryAction } from '@/lib/server-actions/services';
import type { CategoryListItem } from '@/types/service';
import { CategoryForm } from './CategoryForm';

export function CategoriesManager() {
  const toast = useToast();
  const [items, setItems] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await listCategoriesAction();
    if (res.success) setItems(res.data);
    else toast.error(res.error.message);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const handleEdit = (item: CategoryListItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteCategoryAction({ id: deleteTarget.id });
    setBusy(false);
    if (res.success) {
      toast.success(deleteTarget.serviceCount > 0 ? 'Categoria desativada' : 'Categoria apagada');
      setDeleteTarget(null);
      fetchCategories();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>
          <Plus size={16} />
          Nova categoria
        </Button>
      </div>

      <div className="border-chi-border overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-chi-border-light bg-chi-cream/50 text-chi-charcoal-soft border-b text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 text-center font-medium">Serviços</th>
                <th className="px-4 py-3 text-center font-medium">Ordem</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-chi-border-light divide-y">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-0">
                      <SkeletonRow cols={4} />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Tag}
                      title="Sem categorias"
                      description="Cria a primeira categoria para agrupar serviços."
                      action={
                        <Button onClick={handleNew} size="sm">
                          <Plus size={16} />
                          Nova categoria
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((cat) => (
                  <tr key={cat.id} className="hover:bg-chi-sand/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color ?? '#1f3d2e' }}
                        />
                        <span className="text-chi-charcoal font-medium">{cat.name.pt}</span>
                      </div>
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3 text-center">
                      {cat.serviceCount}
                    </td>
                    <td className="text-chi-charcoal-soft px-4 py-3 text-center">{cat.order}</td>
                    <td className="px-4 py-3">
                      {cat.active ? (
                        <Badge tone="success" dot>
                          Ativa
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Inativa
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(cat)}
                          aria-label="Editar"
                          title="Editar"
                          className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          aria-label="Apagar"
                          title="Apagar"
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

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editing}
        onSaved={fetchCategories}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Apagar categoria"
        description={deleteTarget?.name.pt}
        size="sm"
        dismissable={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              {deleteTarget && deleteTarget.serviceCount > 0 ? 'Desativar' : 'Apagar'}
            </Button>
          </>
        }
      >
        <p className="text-chi-charcoal-soft text-sm">
          {deleteTarget && deleteTarget.serviceCount > 0
            ? `Esta categoria tem ${deleteTarget.serviceCount} serviço(s). Não pode ser apagada — será desativada.`
            : 'A categoria será apagada definitivamente.'}
        </p>
      </Modal>
    </div>
  );
}
