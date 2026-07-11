// 📄 src/components/admin/settings/FiscalSettingsForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { updateFiscalSettingsAction } from '@/lib/server-actions/settings';

export type FiscalSettingsInitial = {
  invoiceProvider: 'mock' | 'moloni' | 'invoicexpress' | 'vendus' | 'atura';
  defaultVatRate: number;
  vatExemptionReason?: string;
  incomePrefix?: string;
  expensePrefix?: string;
  moloni: {
    enabled: boolean;
    companyId?: number;
    defaultDocumentSetId?: number;
    vatTaxId?: number;
    consumidorFinalCustomerId?: number;
    defaultPaymentMethodId?: number;
  };
};

type FormValues = {
  invoiceProvider: FiscalSettingsInitial['invoiceProvider'];
  defaultVatRate: string;
  vatExemptionReason: string;
  incomePrefix: string;
  expensePrefix: string;
  moloniEnabled: boolean;
  companyId: string;
  defaultDocumentSetId: string;
  vatTaxId: string;
  consumidorFinalCustomerId: string;
  defaultPaymentMethodId: string;
};

function str(n?: number): string {
  return n != null ? String(n) : '';
}
function num(s: string): number | undefined {
  const v = s.trim();
  return v ? Number(v) : undefined;
}

export function FiscalSettingsForm({ initial }: { initial: FiscalSettingsInitial }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      invoiceProvider: initial.invoiceProvider,
      defaultVatRate: String(initial.defaultVatRate ?? 23),
      vatExemptionReason: initial.vatExemptionReason ?? '',
      incomePrefix: initial.incomePrefix ?? '',
      expensePrefix: initial.expensePrefix ?? '',
      moloniEnabled: initial.moloni.enabled,
      companyId: str(initial.moloni.companyId),
      defaultDocumentSetId: str(initial.moloni.defaultDocumentSetId),
      vatTaxId: str(initial.moloni.vatTaxId),
      consumidorFinalCustomerId: str(initial.moloni.consumidorFinalCustomerId),
      defaultPaymentMethodId: str(initial.moloni.defaultPaymentMethodId),
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    const res = await updateFiscalSettingsAction({
      invoiceProvider: v.invoiceProvider,
      defaultVatRate: Number(v.defaultVatRate) || 23,
      vatExemptionReason: v.vatExemptionReason.trim() || undefined,
      incomePrefix: v.incomePrefix.trim() || undefined,
      expensePrefix: v.expensePrefix.trim() || undefined,
      moloni: {
        enabled: v.moloniEnabled,
        companyId: num(v.companyId),
        defaultDocumentSetId: num(v.defaultDocumentSetId),
        vatTaxId: num(v.vatTaxId),
        consumidorFinalCustomerId: num(v.consumidorFinalCustomerId),
        defaultPaymentMethodId: num(v.defaultPaymentMethodId),
      },
    });
    if (res.success) toast.success('Definições guardadas');
    else toast.error(res.error.message);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Geral */}
      <section className="border-chi-border space-y-4 rounded-lg border bg-white p-5">
        <h2 className="text-chi-green-darker font-serif text-lg">Geral</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Provider de faturação</Label>
            <Select {...register('invoiceProvider')}>
              <option value="mock">Mock (testes — sem faturação real)</option>
              <option value="moloni">Moloni (certificado AT)</option>
            </Select>
            <p className="text-chi-charcoal-light mt-1 text-xs">
              Usa Mock para testar; muda para Moloni quando os IDs abaixo estiverem preenchidos.
            </p>
          </div>
          <div>
            <Label required>IVA por defeito (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              {...register('defaultVatRate')}
              error={!!errors.defaultVatRate}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Motivo de isenção</Label>
            <Input {...register('vatExemptionReason')} placeholder="Ex: M99" />
          </div>
          <div>
            <Label>Prefixo receitas</Label>
            <Input {...register('incomePrefix')} placeholder="REC" />
          </div>
          <div>
            <Label>Prefixo despesas</Label>
            <Input {...register('expensePrefix')} placeholder="DESP" />
          </div>
        </div>
      </section>

      {/* Moloni */}
      <section className="border-chi-border space-y-4 rounded-lg border bg-white p-5">
        <div>
          <h2 className="text-chi-green-darker font-serif text-lg">Moloni</h2>
          <p className="text-chi-charcoal-soft text-sm">
            IDs da tua conta Moloni. As credenciais (client id/secret, utilizador) ficam nas
            variáveis de ambiente — aqui só os IDs. Testa primeiro no sandbox.
          </p>
        </div>

        <Checkbox {...register('moloniEnabled')} label="Moloni ativo" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Company ID</Label>
            <Input type="number" {...register('companyId')} placeholder="ex: 123456" />
          </div>
          <div>
            <Label>Série (document set ID)</Label>
            <Input type="number" {...register('defaultDocumentSetId')} />
          </div>
          <div>
            <Label>Imposto IVA (tax ID)</Label>
            <Input type="number" {...register('vatTaxId')} />
          </div>
          <div>
            <Label>Consumidor Final (customer ID)</Label>
            <Input type="number" {...register('consumidorFinalCustomerId')} />
          </div>
          <div>
            <Label>Método de pagamento (ID)</Label>
            <Input type="number" {...register('defaultPaymentMethodId')} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Guardar definições
        </Button>
      </div>
    </form>
  );
}
