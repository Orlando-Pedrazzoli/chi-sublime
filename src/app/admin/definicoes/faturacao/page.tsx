// 📄 src/app/admin/definicoes/faturacao/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getFiscalSettings } from '@/lib/models';
import {
  FiscalSettingsForm,
  type FiscalSettingsInitial,
} from '@/components/admin/settings/FiscalSettingsForm';

export const metadata: Metadata = {
  title: 'Faturação',
  robots: { index: false, follow: false },
};

export default async function FaturacaoPage() {
  await requireAdmin();
  const s = await getFiscalSettings();

  const initial: FiscalSettingsInitial = {
    invoiceProvider: s.invoiceProvider,
    defaultVatRate: s.defaultVatRate,
    vatExemptionReason: s.vatExemptionReason ?? '',
    incomePrefix: s.incomePrefix ?? '',
    expensePrefix: s.expensePrefix ?? '',
    moloni: {
      enabled: s.moloni?.enabled ?? false,
      companyId: s.moloni?.companyId,
      defaultDocumentSetId: s.moloni?.defaultDocumentSetId,
      vatTaxId: s.moloni?.vatTaxId,
      consumidorFinalCustomerId: s.moloni?.consumidorFinalCustomerId,
      defaultPaymentMethodId: s.moloni?.defaultPaymentMethodId,
    },
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/definicoes"
          className="text-chi-charcoal-soft hover:text-chi-green-deep inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Definições
        </Link>
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Faturação</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Provider de faturação e configuração do Moloni.
        </p>
      </div>
      <FiscalSettingsForm initial={initial} />
    </div>
  );
}
