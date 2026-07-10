// 📄 src/app/admin/servicos/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { ServicesTabs } from '@/components/admin/services/ServicesTabs';

export const metadata: Metadata = {
  title: 'Serviços',
  robots: { index: false, follow: false },
};

export default async function AdminServicesPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Serviços</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Catálogo de serviços e categorias do salão.
        </p>
      </div>
      <ServicesTabs />
    </div>
  );
}
