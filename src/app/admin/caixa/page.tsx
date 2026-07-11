// 📄 src/app/admin/caixa/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { CashRegisterView } from '@/components/admin/cash/CashRegisterView';

export const metadata: Metadata = {
  title: 'Caixa',
  robots: { index: false, follow: false },
};

export default async function AdminCashPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Caixa</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Abertura e fecho de caixa com conferência do numerário.
        </p>
      </div>
      <CashRegisterView />
    </div>
  );
}
