import type { Metadata } from 'next';
import Link from 'next/link';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Redefinir password · Chi Sublime',
  robots: { index: false, follow: false },
};

type SearchParams = { token?: string };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const hasToken = !!params.token;

  return (
    <>
      <PublicNavbar />

      <main className="min-h-screen px-6 py-32 md:px-12" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="mx-auto max-w-md">
          <p
            className="mb-3 text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#B8924A' }}
          >
            Nova password
          </p>

          <h1 className="mb-2 text-center font-serif text-4xl" style={{ color: '#1F3D2E' }}>
            Definir password
          </h1>

          <p className="mb-8 text-center text-sm" style={{ color: '#5A5A5A' }}>
            Escolhe uma password segura para a tua conta.
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
            {hasToken ? (
              <PasswordResetForm mode="reset" />
            ) : (
              <div className="space-y-4 text-center">
                <h3 className="font-serif text-xl" style={{ color: '#B23C3C' }}>
                  Link inválido
                </h3>
                <p className="text-sm" style={{ color: '#5A5A5A' }}>
                  Este link não é válido. Pede um novo link de recuperação.
                </p>
                <Link
                  href="/recuperar-password"
                  className="inline-block rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase"
                  style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
                >
                  Pedir novo link
                </Link>
              </div>
            )}
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
