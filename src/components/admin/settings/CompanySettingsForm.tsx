// 📄 src/components/admin/settings/CompanySettingsForm.tsx
/**
 * Chi Sublime — Definições » Empresa
 * ============================================================
 *
 * Edita a identidade fiscal e os contactos do salão guardados no
 * FiscalSettings (key: 'default'). Estes dados alimentam a
 * faturação certificada (Moloni) e os documentos emitidos —
 * o NIF aqui DEVE ser o do titular da atividade.
 */

'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { updateCompanySettingsAction } from '@/lib/server-actions/settings';

export type CompanySettingsInitial = {
  companyName: string;
  tradingName: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  fiscalEmail: string;
  iban: string;
};

export function CompanySettingsForm({ initial }: { initial: CompanySettingsInitial }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettingsInitial>({ defaultValues: initial });

  async function onSubmit(values: CompanySettingsInitial) {
    const result = await updateCompanySettingsAction(values);
    if (result.success) {
      toast.success('Dados da empresa guardados.');
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Identidade fiscal */}
      <fieldset className="space-y-4">
        <legend
          className="text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ color: '#1F3D2E' }}
        >
          Identidade fiscal
        </legend>

        <div>
          <Label htmlFor="companyName">Nome fiscal (titular da atividade)</Label>
          <Input
            id="companyName"
            {...register('companyName', { required: 'Nome obrigatório' })}
            placeholder="Jean Barbosa da Silva"
          />
          {errors.companyName && (
            <p className="text-chi-danger mt-1 text-xs">{errors.companyName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tradingName">Nome comercial (marca)</Label>
            <Input id="tradingName" {...register('tradingName')} placeholder="Chi Sublime" />
          </div>
          <div>
            <Label htmlFor="vatNumber">NIF</Label>
            <Input
              id="vatNumber"
              inputMode="numeric"
              maxLength={9}
              {...register('vatNumber', {
                required: 'NIF obrigatório',
                pattern: { value: /^\d{9}$/, message: 'NIF deve ter 9 dígitos' },
              })}
              placeholder="295145870"
            />
            {errors.vatNumber && (
              <p className="text-chi-danger mt-1 text-xs">{errors.vatNumber.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Morada fiscal */}
      <fieldset className="space-y-4">
        <legend
          className="text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ color: '#1F3D2E' }}
        >
          Morada (domicílio fiscal)
        </legend>

        <div>
          <Label htmlFor="address">Morada</Label>
          <Input
            id="address"
            {...register('address', { required: 'Morada obrigatória' })}
            placeholder="Rua, número, andar"
          />
          {errors.address && (
            <p className="text-chi-danger mt-1 text-xs">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="postalCode">Código postal</Label>
            <Input
              id="postalCode"
              {...register('postalCode', {
                required: 'Código postal obrigatório',
                pattern: { value: /^\d{4}-\d{3}$/, message: 'Formato: 0000-000' },
              })}
              placeholder="2750-123"
            />
            {errors.postalCode && (
              <p className="text-chi-danger mt-1 text-xs">{errors.postalCode.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="city">Localidade</Label>
            <Input
              id="city"
              {...register('city', { required: 'Localidade obrigatória' })}
              placeholder="Cascais"
            />
            {errors.city && <p className="text-chi-danger mt-1 text-xs">{errors.city.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Contactos */}
      <fieldset className="space-y-4">
        <legend
          className="text-xs font-semibold tracking-[0.18em] uppercase"
          style={{ color: '#1F3D2E' }}
        >
          Contactos e pagamentos
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register('phone')} placeholder="+351 932 932 691" />
          </div>
          <div>
            <Label htmlFor="fiscalEmail">Email fiscal</Label>
            <Input
              id="fiscalEmail"
              type="email"
              {...register('fiscalEmail', { required: 'Email obrigatório' })}
              placeholder="contacto@chisublime.pt"
            />
            {errors.fiscalEmail && (
              <p className="text-chi-danger mt-1 text-xs">{errors.fiscalEmail.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="iban">IBAN (opcional — aparece em documentos)</Label>
          <Input
            id="iban"
            {...register('iban', {
              pattern: {
                value: /^(PT50\d{21})?$/,
                message: 'IBAN PT inválido (PT50 + 21 dígitos)',
              },
            })}
            placeholder="PT50000000000000000000000"
          />
          {errors.iban && <p className="text-chi-danger mt-1 text-xs">{errors.iban.message}</p>}
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'A guardar…' : 'Guardar alterações'}
        </Button>
      </div>
    </form>
  );
}
