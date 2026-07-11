// 📄 src/components/admin/transactions/CategoryManager.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Input, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { eurosToCents, centsToEuros } from '@/lib/utils/cents';
import {
  listIncomeCategoriesAction,
  createIncomeCategoryAction,
  updateIncomeCategoryAction,
  deleteIncomeCategoryAction,
  listExpenseCategoriesAction,
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
  deleteExpenseCategoryAction,
} from '@/lib/server-actions/transactions';
import type { FinanceCategoryItem } from '@/types/transaction';

type Kind = 'income' | 'expense';

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

// ============================================================
// Form (Drawer)
// ============================================================

type FormValues = {
  name: string;
  description: string;
  color: string;
  icon: string;
  order: string;
  active: boolean;
  isFixed: boolean;
  monthlyBudgetEuros: string;
};

function toDefaults(kind: Kind, cat?: FinanceCategoryItem | null): FormValues {
  return {
    name: cat?.name ?? '',
    description: cat?.description ?? '',
    color: cat?.color ?? (kind === 'income' ? '#1f3d2e' : '#b23c3c'),
    icon: cat?.icon ?? '',
    order: String(cat?.order ?? 0),
    active: cat?.active ?? true,
    isFixed: cat?.isFixed ?? false,
    monthlyBudgetEuros: cat?.monthlyBudget ? String(centsToEuros(cat.monthlyBudget)) : '',
  };
}

const ERROR_KEY_MAP: Record<string, keyof FormValues> = {
  name: 'name',
  description: 'description',
  color: 'color',
  icon: 'icon',
  order: 'order',
  monthlyBudget: 'monthlyBudgetEuros',
};

function CategoryFormDrawer({
  kind,
  open,
  onClose,
  category,
  onSaved,
}: {
  kind: Kind;
  open: boolean;
  onClose: () => void;
  category?: FinanceCategoryItem | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = Boolean(category);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(kind, category) });

  useEffect(() => {
    if (open) reset(toDefaults(kind, category));
  }, [open, kind, category, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const base = {
      name: v.name.trim(),
      description: v.description.trim() || undefined,
      color: v.color,
      icon: v.icon.trim() || undefined,
      order: Number(v.order) || 0,
      active: v.active,
    };
    const payload =
      kind === 'expense'
        ? {
            ...base,
            isFixed: v.isFixed,
            monthlyBudget: v.monthlyBudgetEuros.trim()
              ? eurosToCents(parseFloat(v.monthlyBudgetEuros.replace(',', '.')) || 0)
              : 0,
          }
        : base;

    let res;
    if (kind === 'income') {
      res =
        isEdit && category
          ? await updateIncomeCategoryAction({ id: category.id, ...payload })
          : await createIncomeCategoryAction(payload);
    } else {
      res =
        isEdit && category
          ? await updateExpenseCategoryAction({ id: category.id, ...payload })
          : await createExpenseCategoryAction(payload);
    }

    if (res.success) {
      toast.success(isEdit ? 'Categoria atualizada' : 'Categoria criada');
      onSaved();
      onClose();
      return;
    }
    const fe = res.error.fieldErrors;
    if (fe) {
      for (const [key, msgs] of Object.entries(fe)) {
        const path = ERROR_KEY_MAP[key];
        if (path && msgs[0]) setError(path, { message: msgs[0] });
      }
    }
    toast.error(res.error.message);
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      description={kind === 'income' ? 'Categoria de receita' : 'Categoria de despesa'}
      size="sm"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="fin-cat-form" loading={isSubmitting}>
            {isEdit ? 'Guardar' : 'Criar'}
          </Button>
        </>
      }
    >
      <form id="fin-cat-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label required>Nome</Label>
          <Input {...register('name', { required: 'Nome obrigatório' })} error={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea {...register('description')} rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Cor</Label>
            <input
              type="color"
              {...register('color')}
              className="border-chi-border h-11 w-full cursor-pointer rounded-md border bg-white p-1"
            />
          </div>
          <div>
            <Label>Ícone</Label>
            <Input {...register('icon')} placeholder="tag" />
          </div>
          <div>
            <Label>Ordem</Label>
            <Input type="number" min={0} {...register('order')} error={!!errors.order} />
          </div>
        </div>

        {kind === 'expense' && (
          <div className="border-chi-border-light bg-chi-cream/40 space-y-4 rounded-md border p-4">
            <Checkbox {...register('isFixed')} label="Despesa fixa (recorrente mensal)" />
            <div>
              <Label>Orçamento mensal (€)</Label>
              <Input
                inputMode="decimal"
                {...register('monthlyBudgetEuros')}
                error={!!errors.monthlyBudgetEuros}
                placeholder="0,00"
              />
              <FieldError>{errors.monthlyBudgetEuros?.message}</FieldError>
            </div>
          </div>
        )}

        <Checkbox {...register('active')} label="Categoria ativa" />
      </form>
    </Drawer>
  );
}

// ============================================================
// Manager
// ============================================================

export function CategoryManager({ kind }: { kind: Kind }) {
  const toast = useToast();
  const [items, setItems] = useState<FinanceCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategoryItem | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res =
      kind === 'income' ? await listIncomeCategoriesAction() : await listExpenseCategoriesAction();
    if (res.success) setItems(res.data);
    else toast.error(res.error.message);
    setLoading(false);
  }, [kind, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const res =
      kind === 'income'
        ? await deleteIncomeCategoryAction({ id: deleteTarget.id })
        : await deleteExpenseCategoryAction({ id: deleteTarget.id });
    setBusy(false);
    if (res.success) {
      toast.success(deleteTarget.usageCount > 0 ? 'Categoria desativada' : 'Categoria apagada');
      setDeleteTarget(null);
      fetchItems();
    } else {
      toast.error(res.error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
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
                {kind === 'expense' && (
                  <th className="px-4 py-3 text-right font-medium">Orçamento</th>
                )}
                <th className="px-4 py-3 text-center font-medium">Movimentos</th>
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
                      icon={FolderOpen}
                      title="Sem categorias"
                      description="Cria a primeira categoria."
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
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-chi-charcoal font-medium">{cat.name}</span>
                        {cat.isDefault && <Badge tone="neutral">Padrão</Badge>}
                        {cat.isFixed && <Badge tone="info">Fixa</Badge>}
                      </div>
                    </td>
                    {kind === 'expense' && (
                      <td className="text-chi-charcoal-soft px-4 py-3 text-right">
                        {cat.monthlyBudget ? money(cat.monthlyBudget) : '—'}
                      </td>
                    )}
                    <td className="text-chi-charcoal-soft px-4 py-3 text-center">
                      {cat.usageCount}
                    </td>
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
                          onClick={() => {
                            setEditing(cat);
                            setFormOpen(true);
                          }}
                          aria-label="Editar"
                          title="Editar"
                          className="text-chi-charcoal-soft hover:bg-chi-sand hover:text-chi-charcoal rounded-md p-2 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          disabled={cat.isDefault}
                          aria-label="Apagar"
                          title={cat.isDefault ? 'Categoria padrão não pode ser apagada' : 'Apagar'}
                          className="text-chi-charcoal-soft hover:bg-chi-danger-bg hover:text-chi-danger rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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

      <CategoryFormDrawer
        kind={kind}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        category={editing}
        onSaved={fetchItems}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Apagar categoria"
        description={deleteTarget?.name}
        size="sm"
        dismissable={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              {deleteTarget && deleteTarget.usageCount > 0 ? 'Desativar' : 'Apagar'}
            </Button>
          </>
        }
      >
        <p className="text-chi-charcoal-soft text-sm">
          {deleteTarget && deleteTarget.usageCount > 0
            ? `Esta categoria tem ${deleteTarget.usageCount} movimento(s). Será desativada em vez de apagada.`
            : 'A categoria será apagada definitivamente.'}
        </p>
      </Modal>
    </div>
  );
}
