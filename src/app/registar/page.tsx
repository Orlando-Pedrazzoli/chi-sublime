import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Criar conta · Chi Sublime',
  description: 'Cria a tua conta Chi Sublime para fazer reservas online.',
  robots: { index: false, follow: false },
};

type SearchParams = { redirect?: string };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    if (session.user.role === 'admin') {
      redirect('/admin/dashboard');
    }
    redirect(params.redirect || '/conta');
  }

  return (
    <>
      <PublicNavbar />

      <main className="min-h-screen px-6 py-32 md:px-12" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="mx-auto max-w-md">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/logo_new.png"
              alt="Chi Sublime"
              width={64}
              height={64}
              className="h-14 w-14"
              priority
            />
          </div>

          {/* Eyebrow */}
          <p
            className="mb-3 text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#B8924A' }}
          >
            Área do cliente
          </p>

          {/* Heading */}
          <h1 className="mb-2 text-center font-serif text-4xl" style={{ color: '#1F3D2E' }}>
            Criar conta
          </h1>

          <p className="mb-8 text-center text-sm" style={{ color: '#5A5A5A' }}>
            Junta-te ao Chi Sublime para reservares e veres o teu histórico.
          </p>

          {/* Decorative divider */}
          <div
            className="mx-auto mb-8 h-px w-12"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(212,175,110,0.6), transparent)',
            }}
          />

          {/* Card */}
          <div
            className="rounded-lg border p-8"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(31,61,46,0.08)',
            }}
          >
            <RegisterForm />
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
