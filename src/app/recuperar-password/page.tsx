import type { Metadata } from 'next';
import Link from 'next/link';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Recuperar password · Chi Sublime',
  description: 'Recupera o acesso à tua conta Chi Sublime.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function RecoverPasswordPage() {
  return (
    <>
      <PublicNavbar />

      <main className="min-h-screen px-6 py-32 md:px-12" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="mx-auto max-w-md">
          <p
            className="mb-3 text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#B8924A' }}
          >
            Recuperação de acesso
          </p>

          <h1 className="mb-2 text-center font-serif text-4xl" style={{ color: '#1F3D2E' }}>
            Esqueceste a password?
          </h1>

          <p className="mb-8 text-center text-sm" style={{ color: '#5A5A5A' }}>
            Mete o teu email e enviamos-te um link para definires uma nova password.
          </p>

          <div
            className="mx-auto mb-8 h-px w-12"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(212,175,110,0.6), transparent)',
            }}
          />

          <div
            className="rounded-lg border p-8"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(31,61,46,0.08)',
            }}
          >
            <PasswordResetForm mode="request" />
          </div>

          <p className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs underline-offset-4 transition-colors hover:underline"
              style={{ color: '#5A5A5A' }}
            >
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
