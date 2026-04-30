'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

type Variant = 'admin' | 'client';

type LoginFormProps = {
  variant: Variant;
  /**
   * URL para redireccionar após login bem-sucedido.
   * Se não fornecido, usa ?redirect= da query string ou default da variant.
   */
  defaultRedirect?: string;
};

const DEFAULT_REDIRECT: Record<Variant, string> = {
  admin: '/admin/dashboard',
  client: '/conta',
};

export function LoginForm({ variant, defaultRedirect }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [error, setError] = useState<string | null>(null);

  const redirectParam = searchParams.get('redirect');
  const targetUrl = redirectParam || defaultRedirect || DEFAULT_REDIRECT[variant];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Honeypot — se preenchido, é bot
    if (website.length > 0) {
      setError('Pedido inválido.');
      return;
    }

    if (!email || !password) {
      setError('Preenche o email e a password.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          email: email.trim().toLowerCase(),
          password,
          redirect: false,
        });

        if (!result) {
          setError('Erro de comunicação. Tenta novamente.');
          return;
        }

        if (result.error) {
          // NextAuth devolve "CredentialsSignin" para credenciais inválidas
          setError('Email ou password incorrectos.');
          return;
        }

        if (result.ok) {
          // Sucesso — redirect via window.location para escapar qualquer Guard
          window.location.href = targetUrl;
        }
      } catch (err) {
        console.error('[login] erro:', err);
        setError('Ocorreu um erro inesperado. Tenta novamente.');
      }
    });
  }

  const isAdmin = variant === 'admin';

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Honeypot — escondido visualmente e dos screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Não preencher
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="login-email"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: isAdmin ? '#FAF7F2' : '#1A1A1A' }}
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-transparent px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: isAdmin ? 'rgba(212,175,110,0.3)' : 'rgba(31,61,46,0.2)',
            color: isAdmin ? '#FAF7F2' : '#1A1A1A',
          }}
          placeholder="o-teu-email@exemplo.com"
        />
      </div>

      {/* Password */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="text-xs tracking-[0.18em] uppercase"
            style={{ color: isAdmin ? '#FAF7F2' : '#1A1A1A' }}
          >
            Password
          </label>
          {!isAdmin && (
            <Link
              href="/recuperar-password"
              className="text-xs tracking-wide underline-offset-2 hover:underline"
              style={{ color: '#B8924A' }}
            >
              Esqueci-me
            </Link>
          )}
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-transparent px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: isAdmin ? 'rgba(212,175,110,0.3)' : 'rgba(31,61,46,0.2)',
            color: isAdmin ? '#FAF7F2' : '#1A1A1A',
          }}
          placeholder="••••••••"
        />
      </div>

      {/* Erro */}
      {error && (
        <div
          role="alert"
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(178,60,60,0.3)',
            backgroundColor: 'rgba(178,60,60,0.08)',
            color: '#B23C3C',
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          backgroundColor: '#D4AF6E',
          color: '#1F3D2E',
        }}
      >
        {isPending ? 'A entrar...' : 'Entrar'}
      </button>

      {/* Footer (apenas variant cliente) */}
      {!isAdmin && (
        <p className="pt-2 text-center text-sm" style={{ color: '#5A5A5A' }}>
          Ainda não tens conta?{' '}
          <Link
            href="/registar"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: '#1F3D2E' }}
          >
            Criar conta
          </Link>
        </p>
      )}
    </form>
  );
}
