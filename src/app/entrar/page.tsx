import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Entrar · Chi Sublime',
  description: 'Entra na tua conta Chi Sublime para gerir as tuas reservas.',
  robots: { index: false, follow: false },
};

type SearchParams = { redirect?: string; registered?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    if (session.user.role === 'admin') {
      redirect('/admin/dashboard');
    }
    redirect(params.redirect || '/conta');
  }

  const justRegistered = params.registered === '1';

  return (
    <>
      <PublicNavbar />

      <main className="min-h-screen px-6 py-32 md:px-12" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="mx-auto max-w-md">
          {/* Eyebrow */}
          <p
            className="mb-3 text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#B8924A' }}
          >
            Área do cliente
          </p>

          {/* Heading */}
          <h1 className="mb-2 text-center font-serif text-4xl" style={{ color: '#1F3D2E' }}>
            Entrar
          </h1>

          <p className="mb-8 text-center text-sm" style={{ color: '#5A5A5A' }}>
            Bem-vindo de volta. Entra para gerir as tuas reservas.
          </p>

          {/* Decorative divider */}
          <div
            className="mx-auto mb-8 h-px w-12"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(212,175,110,0.6), transparent)',
            }}
          />

          {/* Banner conta criada */}
          {justRegistered && (
            <div
              className="mb-6 rounded-md border-l-4 px-4 py-3 text-sm"
              style={{
                backgroundColor: 'rgba(151,196,89,0.12)',
                borderColor: '#97C459',
                color: '#1F3D2E',
              }}
            >
              Conta criada com sucesso! Entra com as tuas credenciais.
            </div>
          )}

          {/* Card */}
          <div
            className="rounded-lg border p-8"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(31,61,46,0.08)',
            }}
          >
            <LoginForm variant="client" />
          </div>

          {/* Voltar */}
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
