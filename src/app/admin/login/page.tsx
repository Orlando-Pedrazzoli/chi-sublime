import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Painel Administrativo · Chi Sublime',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Se já está logado como admin, vai directo para o dashboard
  const session = await auth();
  if (session?.user?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-6 py-12"
      style={{
        backgroundColor: '#142820',
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(212,175,110,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(31,61,46,0.4) 0%, transparent 70%)',
      }}
    >
      {/* Decorative top border */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(212,175,110,0.4), transparent)',
        }}
      />

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-12 flex flex-col items-center gap-3">
          <Image
            src="/images/logo_new.png"
            alt="Chi Sublime"
            width={64}
            height={64}
            className="h-14 w-14"
            priority
          />
          <span className="font-serif text-2xl tracking-wider italic" style={{ color: '#FAF7F2' }}>
            Chi <span style={{ color: '#D4AF6E' }}>Sublime</span>
          </span>
        </Link>

        {/* Card */}
        <div
          className="rounded-lg border p-8 shadow-2xl backdrop-blur-sm sm:p-10"
          style={{
            backgroundColor: 'rgba(31,61,46,0.4)',
            borderColor: 'rgba(212,175,110,0.15)',
          }}
        >
          {/* Eyebrow */}
          <p
            className="mb-2 text-center text-[10px] tracking-[0.3em] uppercase"
            style={{ color: '#B8924A' }}
          >
            Painel Administrativo
          </p>

          {/* Heading */}
          <h1 className="mb-1 text-center font-serif text-3xl" style={{ color: '#FAF7F2' }}>
            Bem-vindo de volta
          </h1>

          <p className="mb-8 text-center text-sm" style={{ color: 'rgba(250,247,242,0.6)' }}>
            Entra com as tuas credenciais para aceder ao painel.
          </p>

          {/* Decorative divider */}
          <div
            className="mx-auto mb-8 h-px w-12"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(212,175,110,0.5), transparent)',
            }}
          />

          {/* Login form */}
          <LoginForm variant="admin" defaultRedirect="/admin/dashboard" />
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-center text-xs tracking-[0.15em] uppercase"
          style={{ color: 'rgba(250,247,242,0.4)' }}
        >
          © {new Date().getFullYear()} Chi Sublime · Quinta da Bicuda
        </p>

        <Link
          href="/"
          className="mt-2 block text-center text-xs underline-offset-4 transition-colors hover:underline"
          style={{ color: 'rgba(212,175,110,0.6)' }}
        >
          ← Voltar ao site
        </Link>
      </div>
    </main>
  );
}
