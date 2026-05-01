import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { requireClient } from '@/lib/auth/permissions';
import { ChangePasswordForm } from '@/components/client-area/ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Segurança',
};

export default async function SecurityPage() {
  await requireClient();

  return (
    <div>
      <div className="mb-8">
        <h2 className="mb-1 font-serif text-3xl" style={{ color: '#1A1A1A' }}>
          Segurança
        </h2>
        <p className="text-sm" style={{ color: '#5A5A5A' }}>
          Gere a tua password e manténs a tua conta segura.
        </p>
      </div>

      {/* Card password */}
      <div
        className="rounded-lg border p-6 sm:p-8"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(31,61,46,0.08)',
        }}
      >
        <div className="mb-6 flex items-start gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(31,61,46,0.08)' }}
          >
            <Shield size={18} strokeWidth={1.5} style={{ color: '#1F3D2E' }} />
          </div>
          <div>
            <h3 className="mb-1 font-serif text-xl" style={{ color: '#1A1A1A' }}>
              Alterar password
            </h3>
            <p className="text-sm" style={{ color: '#5A5A5A' }}>
              Recomendamos uma password forte com pelo menos 8 caracteres, incluindo letras e
              números.
            </p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>

      {/* Info adicional */}
      <div
        className="mt-6 rounded-md p-4 text-xs"
        style={{
          backgroundColor: 'rgba(212,175,110,0.08)',
          color: '#5A5A5A',
        }}
      >
        Por motivos de segurança, ao alterar a password, todas as sessões activas em outros
        dispositivos serão mantidas. Para sair em todos os dispositivos, contacta o salão.
      </div>
    </div>
  );
}
