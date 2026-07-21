// 📄 src/app/admin/definicoes/empresa/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getFiscalSettings } from '@/lib/models';
import {
  CompanySettingsForm,
  type CompanySettingsInitial,
} from '@/components/admin/settings/CompanySettingsForm';

export const metadata: Metadata = {
  title: 'Empresa',
  robots: { index: false, follow: false },
};

export default async function EmpresaPage() {
  await requireAdmin();
  const s = await getFiscalSettings();

  const initial: CompanySettingsInitial = {
    companyName: s.companyName ?? '',
    tradingName: s.tradingName ?? '',
    vatNumber: s.vatNumber ?? '',
    address: s.address ?? '',
    postalCode: s.postalCode ?? '',
    city: s.city ?? '',
    phone: s.phone ?? '',
    fiscalEmail: s.fiscalEmail ?? '',
    iban: s.iban ?? '',
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
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Empresa</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Identidade fiscal, morada e contactos do salão. Estes dados aparecem nos documentos de
          faturação — o NIF deve ser o do titular da atividade registado nas Finanças.
        </p>
      </div>

      <div className="border-chi-border rounded-lg border bg-white p-6 sm:p-8">
        <CompanySettingsForm initial={initial} />
      </div>
    </div>
  );
}
