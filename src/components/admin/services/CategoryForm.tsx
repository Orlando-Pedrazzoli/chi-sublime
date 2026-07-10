// 📄 src/components/admin/services/CategoryForm.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { createCategoryAction, updateCategoryAction } from '@/lib/server-actions/services';
import type { CategoryListItem } from '@/types/service';

type FormValues = {
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  icon: string;
  color: string;
  order: string;
  active: boolean;
  slug: string;
};

function toDefaults(cat?: CategoryListItem | null): FormValues {
  return {
    namePt: cat?.name.pt ?? '',
    nameEn: cat?.name.en ?? '',
    descPt: cat?.description?.pt ?? '',
    descEn: cat?.description?.en ?? '',
    icon: cat?.icon ?? '',
    color: cat?.color ?? '#1f3d2e',
    order: String(cat?.order ?? 0),
    active: cat?.active ?? true,
    slug: cat?.slug ?? '',
  };
}

const ERROR_KEY_MAP: Record<string, keyof FormValues> = {
  'name.pt': 'namePt',
  'name.en': 'nameEn',
  'description.pt': 'descPt',
  'description.en': 'descEn',
  icon: 'icon',
  color: 'color',
  order: 'order',
  slug: 'slug',
};

export type CategoryFormProps = {
  open: boolean;
  onClose: () => void;
  category?: CategoryListItem | null;
  onSaved: () => void;
};

export function CategoryForm({ open, onClose, category, onSaved }: CategoryFormProps) {
  const toast = useToast();
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(category) });

  useEffect(() => {
    if (open) reset(toDefaults(category));
  }, [open, category, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const hasDesc = v.descPt.trim() || v.descEn.trim();
    const payload = {
      name: { pt: v.namePt.trim(), en: v.nameEn.trim() || undefined },
      description: hasDesc
        ? { pt: v.descPt.trim() || undefined, en: v.descEn.trim() || undefined }
        : undefined,
      icon: v.icon.trim() || undefined,
      color: v.color || undefined,
      order: Number(v.order) || 0,
      active: v.active,
      slug: v.slug.trim() || undefined,
    };

    const res =
      isEdit && category
        ? await updateCategoryAction({ id: category.id, ...payload })
        : await createCategoryAction(payload);

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
      description={isEdit ? category?.name.pt : 'Agrupa serviços por tipo'}
      size="md"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" loading={isSubmitting}>
            {isEdit ? 'Guardar' : 'Criar categoria'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Nome (PT)</Label>
            <Input
              {...register('namePt', { required: 'Nome obrigatório' })}
              error={!!errors.namePt}
            />
            <FieldError>{errors.namePt?.message}</FieldError>
          </div>
          <div>
            <Label>Nome (EN)</Label>
            <Input {...register('nameEn')} error={!!errors.nameEn} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Descrição (PT)</Label>
            <Textarea {...register('descPt')} rows={2} />
          </div>
          <div>
            <Label>Descrição (EN)</Label>
            <Textarea {...register('descEn')} rows={2} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Ícone</Label>
            <Input {...register('icon')} placeholder="scissors" />
          </div>
          <div>
            <Label>Cor</Label>
            <input
              type="color"
              {...register('color')}
              className="border-chi-border h-11 w-full cursor-pointer rounded-md border bg-white p-1"
            />
            <FieldError>{errors.color?.message}</FieldError>
          </div>
          <div>
            <Label>Ordem</Label>
            <Input type="number" min={0} {...register('order')} error={!!errors.order} />
          </div>
        </div>

        <div>
          <Label>Slug (opcional)</Label>
          <Input
            {...register('slug')}
            placeholder="gerado do nome se vazio"
            error={!!errors.slug}
          />
          <FieldError>{errors.slug?.message}</FieldError>
        </div>

        <Checkbox {...register('active')} label="Categoria ativa" />
      </form>
    </Drawer>
  );
}
