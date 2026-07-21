// 📄 src/app/admin/definicoes/utilizadores/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { listAdminUsersAction } from '@/lib/server-actions/admin-users';
import { AdminUsersManager } from '@/components/admin/settings/AdminUsersManager';

export const metadata: Metadata = {
  title: 'Utilizadores',
  robots: { index: false, follow: false },
};

export default async function UtilizadoresPage() {
  const admin = await requireAdmin();
  const result = await listAdminUsersAction();
  const users = result.success ? result.data.users : [];

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
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Utilizadores</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Quem pode aceder ao painel de administração. Cada pessoa deve ter a sua própria conta —
          nunca partilhem a mesma password.
        </p>
      </div>

      <AdminUsersManager initialUsers={users} currentUserId={admin.id} />
    </div>
  );
}
