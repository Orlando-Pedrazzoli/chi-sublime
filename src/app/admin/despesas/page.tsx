// 📄 src/app/admin/despesas/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { DespesasTabs } from '@/components/admin/transactions/DespesasTabs';

export const metadata: Metadata = {
  title: 'Despesas',
  robots: { index: false, follow: false },
};

export default async function AdminExpensesPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Despesas</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Registo de despesas do salão e respetivas categorias.
        </p>
      </div>
      <DespesasTabs />
    </div>
  );
}
