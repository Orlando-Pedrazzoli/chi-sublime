// 📄 src/app/admin/clientes/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { ClientsTable } from '@/components/admin/clients/ClientsTable';

export const metadata: Metadata = {
  title: 'Clientes',
  robots: { index: false, follow: false },
};

export default async function AdminClientsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Clientes</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Gere a base de clientes do salão — contactos, dados fiscais e histórico.
        </p>
      </div>
      <ClientsTable />
    </div>
  );
}
