// 📄 src/components/admin/clients/ClientForm.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input, FieldError } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { createClientAction, updateClientAction } from '@/lib/server-actions/clients';
import type { ClientDetail } from '@/types/client';

type FiscalValues = {
  vatNumber: string;
  fullLegalName: string;
  address: string;
  postalCode: string;
  city: string;
};

type FormValues = {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  source: 'online' | 'walk-in' | 'phone' | 'referral' | 'instagram';
  notes: string;
  tagsText: string;
  marketingConsent: boolean;
  fiscalData: FiscalValues;
};

function toDefaults(client?: ClientDetail | null): FormValues {
  return {
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    birthday: client?.birthday ? client.birthday.slice(0, 10) : '',
    source: (client?.source as FormValues['source']) ?? 'walk-in',
    notes: client?.notes ?? '',
    tagsText: client?.tags?.join(', ') ?? '',
    marketingConsent: client?.marketingConsent ?? false,
    fiscalData: {
      vatNumber: client?.fiscalData?.vatNumber ?? '',
      fullLegalName: client?.fiscalData?.fullLegalName ?? '',
      address: client?.fiscalData?.address ?? '',
      postalCode: client?.fiscalData?.postalCode ?? '',
      city: client?.fiscalData?.city ?? '',
    },
  };
}

/** Mapeia chaves de fieldErrors do servidor → caminhos do form. */
const ERROR_KEY_MAP: Record<string, keyof FormValues | `fiscalData.${keyof FiscalValues}`> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  birthday: 'birthday',
  source: 'source',
  notes: 'notes',
  tags: 'tagsText',
  marketingConsent: 'marketingConsent',
  'fiscalData.vatNumber': 'fiscalData.vatNumber',
  'fiscalData.fullLegalName': 'fiscalData.fullLegalName',
  'fiscalData.address': 'fiscalData.address',
  'fiscalData.postalCode': 'fiscalData.postalCode',
  'fiscalData.city': 'fiscalData.city',
};

export type ClientFormProps = {
  open: boolean;
  onClose: () => void;
  /** Presente = edição; ausente = criação. */
  client?: ClientDetail | null;
  onSaved: () => void;
};

export function ClientForm({ open, onClose, client, onSaved }: ClientFormProps) {
  const toast = useToast();
  const isEdit = Boolean(client);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(client) });

  // Repõe os valores sempre que abre (ou muda o cliente em edição)
  useEffect(() => {
    if (open) reset(toDefaults(client));
  }, [open, client, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const fiscalFilled = Object.values(values.fiscalData).some((v) => v.trim().length > 0);

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim() || undefined,
      birthday: values.birthday || undefined,
      source: values.source,
      notes: values.notes.trim() || undefined,
      marketingConsent: values.marketingConsent,
      tags: values.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      fiscalData: fiscalFilled
        ? {
            vatNumber: values.fiscalData.vatNumber.trim() || undefined,
            fullLegalName: values.fiscalData.fullLegalName.trim() || undefined,
            address: values.fiscalData.address.trim() || undefined,
            postalCode: values.fiscalData.postalCode.trim() || undefined,
            city: values.fiscalData.city.trim() || undefined,
          }
        : undefined,
    };

    const result =
      isEdit && client
        ? await updateClientAction({ id: client.id, ...payload })
        : await createClientAction(payload);

    if (result.success) {
      toast.success(isEdit ? 'Cliente atualizado' : 'Cliente criado');
      onSaved();
      onClose();
      return;
    }

    // Hidratar erros de campo, se vierem
    const fieldErrors = result.error.fieldErrors;
    if (fieldErrors) {
      for (const [key, messages] of Object.entries(fieldErrors)) {
        const path = ERROR_KEY_MAP[key];
        if (path && messages[0]) setError(path, { message: messages[0] });
      }
    }
    toast.error(result.error.message);
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      description={isEdit ? client?.name : 'Adicionar um cliente ao salão'}
      size="md"
      dismissable={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" loading={isSubmitting}>
            {isEdit ? 'Guardar alterações' : 'Criar cliente'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} className="space-y-5">
        <div>
          <Label required>Nome</Label>
          <Input {...register('name', { required: 'Nome obrigatório' })} error={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Telefone</Label>
            <Input
              {...register('phone', { required: 'Telefone obrigatório' })}
              error={!!errors.phone}
              placeholder="912 345 678"
            />
            <FieldError>{errors.phone?.message}</FieldError>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" {...register('email')} error={!!errors.email} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Data de nascimento</Label>
            <DatePicker {...register('birthday')} error={!!errors.birthday} />
            <FieldError>{errors.birthday?.message}</FieldError>
          </div>
          <div>
            <Label>Origem</Label>
            <Select {...register('source')}>
              <option value="walk-in">Balcão</option>
              <option value="online">Online</option>
              <option value="phone">Telefone</option>
              <option value="referral">Referência</option>
              <option value="instagram">Instagram</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Etiquetas</Label>
          <Input {...register('tagsText')} placeholder="VIP, coloração, fidelizada" />
          <p className="text-chi-charcoal-light mt-1 text-xs">Separadas por vírgula.</p>
          <FieldError>{errors.tagsText?.message}</FieldError>
        </div>

        <div>
          <Label>Notas</Label>
          <Textarea {...register('notes')} rows={3} />
        </div>

        <Checkbox {...register('marketingConsent')} label="Aceita comunicações de marketing" />

        {/* Dados fiscais (opcionais) */}
        <div className="border-chi-border-light bg-chi-cream/40 space-y-4 rounded-md border p-4">
          <p className="text-chi-green-deep text-sm font-medium">Dados fiscais (opcional)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>NIF</Label>
              <Input
                {...register('fiscalData.vatNumber')}
                error={!!errors.fiscalData?.vatNumber}
                placeholder="123456789"
              />
              <FieldError>{errors.fiscalData?.vatNumber?.message}</FieldError>
            </div>
            <div>
              <Label>Nome fiscal</Label>
              <Input {...register('fiscalData.fullLegalName')} />
            </div>
          </div>
          <div>
            <Label>Morada</Label>
            <Input {...register('fiscalData.address')} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Código postal</Label>
              <Input
                {...register('fiscalData.postalCode')}
                error={!!errors.fiscalData?.postalCode}
                placeholder="0000-000"
              />
              <FieldError>{errors.fiscalData?.postalCode?.message}</FieldError>
            </div>
            <div>
              <Label>Localidade</Label>
              <Input {...register('fiscalData.city')} />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
