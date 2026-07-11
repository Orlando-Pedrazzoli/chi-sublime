// 📄 src/app/admin/equipa/page.tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { StaffTable } from '@/components/admin/staff/StaffTable';

export const metadata: Metadata = {
  title: 'Equipa',
  robots: { index: false, follow: false },
};

export default async function AdminStaffPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Equipa</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Gere os profissionais do salão — perfil, horário e férias.
        </p>
      </div>
      <StaffTable />
    </div>
  );
}
