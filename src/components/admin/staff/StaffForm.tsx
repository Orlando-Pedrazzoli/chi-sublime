// 📄 src/components/admin/staff/StaffForm.tsx
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
import { createStaffAction, updateStaffAction } from '@/lib/server-actions/staff';
import type { StaffDetail } from '@/types/staff';

type FormValues = {
  name: string;
  rolePt: string;
  roleEn: string;
  specialtyPt: string;
  specialtyEn: string;
  bioPt: string;
  bioEn: string;
  specialtiesText: string;
  email: string;
  phone: string;
  photo: string;
  commissionRate: string;
  order: string;
  active: boolean;
  slug: string;
};

function toDefaults(s?: StaffDetail | null): FormValues {
  return {
    name: s?.name ?? '',
    rolePt: s?.role.pt ?? '',
    roleEn: s?.role.en ?? '',
    specialtyPt: s?.specialty?.pt ?? '',
    specialtyEn: s?.specialty?.en ?? '',
    bioPt: s?.bio?.pt ?? '',
    bioEn: s?.bio?.en ?? '',
    specialtiesText: s?.specialties?.join(', ') ?? '',
    email: s?.email ?? '',
    phone: s?.phone ?? '',
    photo: s?.photo ?? '',
    commissionRate: s?.commissionRate != null ? String(s.commissionRate) : '',
    order: String(s?.order ?? 0),
    active: s?.active ?? true,
    slug: s?.slug ?? '',
  };
}

const ERROR_KEY_MAP: Record<string, keyof FormValues> = {
  name: 'name',
  'role.pt': 'rolePt',
  'role.en': 'roleEn',
  'specialty.pt': 'specialtyPt',
  email: 'email',
  phone: 'phone',
  photo: 'photo',
  commissionRate: 'commissionRate',
  order: 'order',
  slug: 'slug',
};

export type StaffFormProps = {
  open: boolean;
  onClose: () => void;
  staff?: StaffDetail | null;
  onSaved: () => void;
};

export function StaffForm({ open, onClose, staff, onSaved }: StaffFormProps) {
  const toast = useToast();
  const isEdit = Boolean(staff);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(staff) });

  useEffect(() => {
    if (open) reset(toDefaults(staff));
  }, [open, staff, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const hasBio = v.bioPt.trim() || v.bioEn.trim();
    const hasSpec = v.specialtyPt.trim() || v.specialtyEn.trim();
    const payload = {
      name: v.name.trim(),
      role: { pt: v.rolePt.trim(), en: v.roleEn.trim() || undefined },
      specialty: hasSpec
        ? { pt: v.specialtyPt.trim() || undefined, en: v.specialtyEn.trim() || undefined }
        : undefined,
      bio: hasBio
        ? { pt: v.bioPt.trim() || undefined, en: v.bioEn.trim() || undefined }
        : undefined,
      specialties: v.specialtiesText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      email: v.email.trim() || undefined,
      phone: v.phone.trim() || undefined,
      photo: v.photo.trim() || undefined,
      commissionRate: v.commissionRate.trim() ? Number(v.commissionRate) : undefined,
      order: Number(v.order) || 0,
      active: v.active,
      slug: v.slug.trim() || undefined,
    };

    const res =
      isEdit && staff
        ? await updateStaffAction({ id: staff.id, ...payload })
        : await createStaffAction(payload);

    if (res.success) {
      toast.success(isEdit ? 'Membro atualizado' : 'Membro criado');
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
      title={isEdit ? 'Editar perfil' : 'Novo membro'}
      description={isEdit ? staff?.name : 'Adicionar um membro à equipa'}
      size="md"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="staff-form" loading={isSubmitting}>
            {isEdit ? 'Guardar' : 'Criar membro'}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label required>Nome</Label>
          <Input {...register('name', { required: 'Nome obrigatório' })} error={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Função (PT)</Label>
            <Input
              {...register('rolePt', { required: 'Função obrigatória' })}
              error={!!errors.rolePt}
              placeholder="Cabeleireiro(a)"
            />
            <FieldError>{errors.rolePt?.message}</FieldError>
          </div>
          <div>
            <Label>Função (EN)</Label>
            <Input {...register('roleEn')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Especialidade (PT)</Label>
            <Input {...register('specialtyPt')} placeholder="Coloração" />
          </div>
          <div>
            <Label>Especialidade (EN)</Label>
            <Input {...register('specialtyEn')} />
          </div>
        </div>

        <div>
          <Label>Competências</Label>
          <Input {...register('specialtiesText')} placeholder="cabelo, maquilhagem, unhas" />
          <p className="text-chi-charcoal-light mt-1 text-xs">Separadas por vírgula.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Email</Label>
            <Input type="email" {...register('email')} error={!!errors.email} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <div>
            <Label>Telefone</Label>
            <Input {...register('phone')} error={!!errors.phone} placeholder="912 345 678" />
            <FieldError>{errors.phone?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Foto (URL)</Label>
            <Input {...register('photo')} placeholder="https://…" error={!!errors.photo} />
          </div>
          <div>
            <Label>Comissão (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              {...register('commissionRate')}
              error={!!errors.commissionRate}
            />
            <FieldError>{errors.commissionRate?.message}</FieldError>
          </div>
        </div>

        <div>
          <Label>Bio (PT)</Label>
          <Textarea {...register('bioPt')} rows={2} />
        </div>
        <div>
          <Label>Bio (EN)</Label>
          <Textarea {...register('bioEn')} rows={2} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Ordem</Label>
            <Input type="number" min={0} {...register('order')} error={!!errors.order} />
          </div>
          <div>
            <Label>Slug (opcional)</Label>
            <Input {...register('slug')} error={!!errors.slug} placeholder="gerado do nome" />
            <FieldError>{errors.slug?.message}</FieldError>
          </div>
        </div>

        <Checkbox {...register('active')} label="Membro ativo" />
      </form>
    </Drawer>
  );
}
