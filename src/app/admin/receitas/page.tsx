// 📄 src/app/admin/receitas/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { ReceitasTabs } from '@/components/admin/transactions/ReceitasTabs';

export const metadata: Metadata = {
  title: 'Receitas',
  robots: { index: false, follow: false },
};

export default async function AdminIncomePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Receitas</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Vendas de balcão (POS) e respetivas categorias.
        </p>
      </div>
      <ReceitasTabs />
    </div>
  );
}
