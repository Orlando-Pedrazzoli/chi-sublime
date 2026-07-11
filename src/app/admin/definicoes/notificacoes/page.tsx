// 📄 src/app/admin/definicoes/notificacoes/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Notificações',
  robots: { index: false, follow: false },
};

export default async function Page() {
  await requireAdmin();

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
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Notificações</h1>
      </div>
      <div className="border-chi-border rounded-lg border border-dashed bg-white p-10 text-center">
        <p className="text-chi-charcoal-soft text-sm">Esta secção está em construção.</p>
      </div>
    </div>
  );
}
