// 📄 src/app/admin/definicoes/seguranca/page.tsx
/**
 * Chi Sublime — Admin: Definições » Segurança
 * ============================================================
 *
 * Permite ao administrador alterar a própria password.
 * Reutiliza o ChangePasswordForm da área de cliente — a server
 * action changePassword valida a password atual e serve qualquer
 * utilizador autenticado, independentemente do role.
 */

import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { ChangePasswordForm } from '@/components/client-area/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Segurança',
  robots: { index: false, follow: false },
};

export default async function AdminSegurancaPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Segurança</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Altera a tua password de acesso ao painel de administração.
        </p>
      </div>

      <div className="border-chi-border rounded-lg border bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="bg-chi-sand text-chi-green-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <Shield size={18} strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-chi-charcoal font-serif text-xl">Alterar password</h2>
            <p className="text-chi-charcoal-soft mt-0.5 text-sm">
              Usa uma password forte e que não utilizes noutros serviços.
            </p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
