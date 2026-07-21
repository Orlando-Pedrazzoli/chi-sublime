'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { requestPasswordReset, resetPassword } from '@/lib/server-actions/auth';
import { PasswordInput } from '@/components/ui/PasswordInput';

type Mode = 'request' | 'reset';

type PasswordResetFormProps = {
  mode: Mode;
};

export function PasswordResetForm({ mode }: PasswordResetFormProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [isPending, startTransition] = useTransition();

  // Modo "request"
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Modo "reset"
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    if (website.length > 0) {
      setErrors({ _global: 'Pedido inválido.' });
      return;
    }

    startTransition(async () => {
      const result = await requestPasswordReset({ email: email.trim().toLowerCase(), website });
      if (result.success) {
        setRequestSuccess(true);
      } else {
        setErrors({ _global: result.error });
      }
    });
  }

  function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    if (!token) {
      setErrors({ _global: 'Token em falta. Verifica o link no email.' });
      return;
    }

    startTransition(async () => {
      const result = await resetPassword({ token, password, passwordConfirm });
      if (result.success) {
        setResetSuccess(true);
      } else {
        if (result.field) {
          setErrors({ [result.field]: result.error });
        } else {
          setErrors({ _global: result.error });
        }
      }
    });
  }

  // ============================================================
  // MODO: Pedir reset (envio de email)
  // ============================================================
  if (mode === 'request') {
    if (requestSuccess) {
      return (
        <div className="space-y-4 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(151,196,89,0.15)' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1F3D2E"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="font-serif text-xl" style={{ color: '#1F3D2E' }}>
            Email enviado
          </h3>
          <p className="text-sm" style={{ color: '#5A5A5A' }}>
            Se existir uma conta com esse email, vais receber um link para redefinir a tua password
            nos próximos minutos.
          </p>
          <p className="text-xs" style={{ color: '#5A5A5A' }}>
            Não te esqueças de verificar a pasta de spam.
          </p>
          <Link
            href="/entrar"
            className="inline-block pt-2 text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: '#1F3D2E' }}
          >
            ← Voltar ao login
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleRequest} className="space-y-5" noValidate>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="reset-email"
            className="mb-2 block text-xs tracking-[0.18em] uppercase"
            style={{ color: '#1A1A1A' }}
          >
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
            style={{ borderColor: 'rgba(31,61,46,0.2)' }}
            placeholder="o-teu-email@exemplo.com"
          />
        </div>

        {errors._global && (
          <div
            role="alert"
            className="rounded-md border px-4 py-3 text-sm"
            style={{
              borderColor: 'rgba(178,60,60,0.3)',
              backgroundColor: 'rgba(178,60,60,0.08)',
              color: '#B23C3C',
            }}
          >
            {errors._global}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          {isPending ? 'A enviar...' : 'Enviar link'}
        </button>

        <p className="pt-2 text-center text-sm" style={{ color: '#5A5A5A' }}>
          Lembraste-te?{' '}
          <Link
            href="/entrar"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: '#1F3D2E' }}
          >
            Voltar ao login
          </Link>
        </p>
      </form>
    );
  }

  // ============================================================
  // MODO: Definir nova password (com token)
  // ============================================================
  if (resetSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(151,196,89,0.15)' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1F3D2E"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="font-serif text-xl" style={{ color: '#1F3D2E' }}>
          Password actualizada
        </h3>
        <p className="text-sm" style={{ color: '#5A5A5A' }}>
          A tua password foi redefinida com sucesso. Já podes entrar com a nova password.
        </p>
        <Link
          href="/entrar"
          className="mt-2 inline-block rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          Entrar agora
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="new-password"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Nova password
        </label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.password ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="Pelo menos 8 caracteres com letras e números"
        />
        {errors.password && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.password}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="new-password-confirm"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Confirmar nova password
        </label>
        <PasswordInput
          id="new-password-confirm"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.passwordConfirm ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="Repete a password"
        />
        {errors.passwordConfirm && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.passwordConfirm}
          </p>
        )}
      </div>

      {errors._global && (
        <div
          role="alert"
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(178,60,60,0.3)',
            backgroundColor: 'rgba(178,60,60,0.08)',
            color: '#B23C3C',
          }}
        >
          {errors._global}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
      >
        {isPending ? 'A actualizar...' : 'Definir nova password'}
      </button>
    </form>
  );
}
