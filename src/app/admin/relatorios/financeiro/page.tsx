// 📄 src/app/admin/relatorios/financeiro/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { FinancialReport } from '@/components/admin/reports/FinancialReport';

export const metadata: Metadata = {
  title: 'Relatório financeiro',
  robots: { index: false, follow: false },
};

export default async function FinancialReportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Relatório financeiro</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Receita, despesa e IVA por período, com exportação em PDF.
        </p>
      </div>
      <FinancialReport />
    </div>
  );
}
