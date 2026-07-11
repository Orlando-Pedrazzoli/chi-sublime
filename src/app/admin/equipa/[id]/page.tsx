// 📄 src/app/admin/equipa/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/permissions';
import { getStaffAction } from '@/lib/server-actions/staff';
import { StaffDetailView } from '@/components/admin/staff/StaffDetailView';

export const metadata: Metadata = {
  title: 'Membro da equipa',
  robots: { index: false, follow: false },
};

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const res = await getStaffAction({ id });
  if (!res.success) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <StaffDetailView staff={res.data} />
    </div>
  );
}
