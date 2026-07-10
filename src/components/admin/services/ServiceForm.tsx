// 📄 src/components/admin/services/ServiceForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { eurosToCents, centsToEuros } from '@/lib/utils/cents';
import {
  createServiceAction,
  updateServiceAction,
  listCategoriesAction,
} from '@/lib/server-actions/services';
import { listStaffAction } from '@/lib/server-actions/staff';
import type { ServiceDetail, CategoryListItem } from '@/types/service';
import type { StaffListItem } from '@/types/staff';

type FormValues = {
  categoryId: string;
  namePt: string;
  nameEn: string;
  descPt: string;
  descEn: string;
  duration: string;
  priceEuros: string;
  vatRate: string;
  bufferAfter: string;
  staffIds: string[];
  image: string;
  requiresDeposit: boolean;
  depositEuros: string;
  order: string;
  active: boolean;
  popular: boolean;
  slug: string;
};

function toDefaults(s?: ServiceDetail | null): FormValues {
  return {
    categoryId: s?.categoryId ?? '',
    namePt: s?.name.pt ?? '',
    nameEn: s?.name.en ?? '',
    descPt: s?.description?.pt ?? '',
    descEn: s?.description?.en ?? '',
    duration: String(s?.duration ?? 30),
    priceEuros: s ? String(centsToEuros(s.price)) : '',
    vatRate: String(s?.vatRate ?? 23),
    bufferAfter: String(s?.bufferAfter ?? 0),
    staffIds: s?.staffIds ?? [],
    image: s?.image ?? '',
    requiresDeposit: s?.requiresDeposit ?? false,
    depositEuros: s?.depositAmount ? String(centsToEuros(s.depositAmount)) : '',
    order: String(s?.order ?? 0),
    active: s?.active ?? true,
    popular: s?.popular ?? false,
    slug: s?.slug ?? '',
  };
}

const ERROR_KEY_MAP: Record<string, keyof FormValues> = {
  categoryId: 'categoryId',
  'name.pt': 'namePt',
  'name.en': 'nameEn',
  duration: 'duration',
  price: 'priceEuros',
  vatRate: 'vatRate',
  bufferAfter: 'bufferAfter',
  depositAmount: 'depositEuros',
  image: 'image',
  order: 'order',
  slug: 'slug',
};

function parseEuros(value: string): number {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export type ServiceFormProps = {
  open: boolean;
  onClose: () => void;
  service?: ServiceDetail | null;
  onSaved: () => void;
};

export function ServiceForm({ open, onClose, service, onSaved }: ServiceFormProps) {
  const toast = useToast();
  const isEdit = Boolean(service);

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [staff, setStaff] = useState<StaffListItem[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(service) });

  useEffect(() => {
    if (!open) return;
    reset(toDefaults(service));
    (async () => {
      const [cats, team] = await Promise.all([
        listCategoriesAction(),
        listStaffAction({ pageSize: 100 }),
      ]);
      if (cats.success) setCategories(cats.data);
      if (team.success) setStaff(team.data.items);
    })();
  }, [open, service, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const hasDesc = v.descPt.trim() || v.descEn.trim();
    const payload = {
      categoryId: v.categoryId,
      name: { pt: v.namePt.trim(), en: v.nameEn.trim() || undefined },
      description: hasDesc
        ? { pt: v.descPt.trim() || undefined, en: v.descEn.trim() || undefined }
        : undefined,
      duration: Number(v.duration) || 0,
      price: eurosToCents(parseEuros(v.priceEuros)),
      vatRate: Number(v.vatRate),
      bufferAfter: Number(v.bufferAfter) || 0,
      staffIds: v.staffIds ?? [],
      image: v.image.trim() || undefined,
      requiresDeposit: v.requiresDeposit,
      depositAmount: eurosToCents(parseEuros(v.depositEuros)),
      order: Number(v.order) || 0,
      active: v.active,
      popular: v.popular,
      slug: v.slug.trim() || undefined,
    };

    const res =
      isEdit && service
        ? await updateServiceAction({ id: service.id, ...payload })
        : await createServiceAction(payload);

    if (res.success) {
      toast.success(isEdit ? 'Serviço atualizado' : 'Serviço criado');
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
      title={isEdit ? 'Editar serviço' : 'Novo serviço'}
      description={isEdit ? service?.name.pt : 'Adicionar um serviço ao catálogo'}
      size="lg"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" loading={isSubmitting}>
            {isEdit ? 'Guardar' : 'Criar serviço'}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label required>Categoria</Label>
          <Select
            {...register('categoryId', { required: 'Categoria obrigatória' })}
            error={!!errors.categoryId}
          >
            <option value="">Seleciona uma categoria…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.pt}
              </option>
            ))}
          </Select>
          <FieldError>{errors.categoryId?.message}</FieldError>
        </div>

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
            <Input {...register('nameEn')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label required>Preço (€)</Label>
            <Input
              inputMode="decimal"
              {...register('priceEuros', { required: 'Preço obrigatório' })}
              error={!!errors.priceEuros}
              placeholder="30,00"
            />
            <FieldError>{errors.priceEuros?.message}</FieldError>
          </div>
          <div>
            <Label>IVA</Label>
            <Select {...register('vatRate')}>
              <option value="23">23%</option>
              <option value="13">13%</option>
              <option value="6">6%</option>
              <option value="0">Isento</option>
            </Select>
          </div>
          <div>
            <Label required>Duração (min)</Label>
            <Input
              type="number"
              min={5}
              step={5}
              {...register('duration')}
              error={!!errors.duration}
            />
            <FieldError>{errors.duration?.message}</FieldError>
          </div>
          <div>
            <Label>Buffer (min)</Label>
            <Input
              type="number"
              min={0}
              step={5}
              {...register('bufferAfter')}
              error={!!errors.bufferAfter}
            />
          </div>
        </div>

        <div>
          <Label>Profissionais que executam</Label>
          <p className="text-chi-charcoal-light mb-2 text-xs">
            Se nenhum for selecionado, qualquer profissional pode executar.
          </p>
          <div className="border-chi-border-light grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
            {staff.length === 0 ? (
              <p className="text-chi-charcoal-light text-sm">A carregar equipa…</p>
            ) : (
              staff.map((m) => (
                <Checkbox key={m.id} value={m.id} label={m.name} {...register('staffIds')} />
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Imagem (URL)</Label>
            <Input {...register('image')} placeholder="https://…" error={!!errors.image} />
          </div>
          <div>
            <Label>Ordem</Label>
            <Input type="number" min={0} {...register('order')} error={!!errors.order} />
          </div>
        </div>

        <div className="border-chi-border-light bg-chi-cream/40 space-y-4 rounded-md border p-4">
          <Checkbox {...register('requiresDeposit')} label="Exige depósito na marcação" />
          <div>
            <Label>Valor do depósito (€)</Label>
            <Input
              inputMode="decimal"
              {...register('depositEuros')}
              error={!!errors.depositEuros}
              placeholder="0,00"
            />
            <FieldError>{errors.depositEuros?.message}</FieldError>
          </div>
        </div>

        <div>
          <Label>Descrição (PT)</Label>
          <Textarea {...register('descPt')} rows={2} />
        </div>
        <div>
          <Label>Descrição (EN)</Label>
          <Textarea {...register('descEn')} rows={2} />
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

        <div className="flex gap-6">
          <Checkbox {...register('active')} label="Ativo" />
          <Checkbox {...register('popular')} label="Popular (destaque)" />
        </div>
      </form>
    </Drawer>
  );
}
