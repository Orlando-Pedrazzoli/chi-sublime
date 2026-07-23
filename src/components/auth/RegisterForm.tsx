'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { registerUser } from '@/lib/server-actions/auth';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { GoogleAuthButton, AuthDivider } from './GoogleAuthButton';

type RegisterFormProps = {
  defaultRedirect?: string;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
  marketingConsent: boolean;
  website: string; // honeypot
};

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  acceptTerms: false,
  marketingConsent: false,
  website: '',
};

export function RegisterForm({ defaultRedirect = '/conta' }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | '_global', string>>>({});

  const redirectParam = searchParams.get('redirect');
  const targetUrl = redirectParam || defaultRedirect;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Limpa erro do campo específico
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next._global;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Honeypot
    if (form.website.length > 0) {
      setErrors({ _global: 'Pedido inválido.' });
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerUser({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          acceptTerms: form.acceptTerms,
          marketingConsent: form.marketingConsent,
          website: form.website,
        } as Parameters<typeof registerUser>[0]);

        if (!result.success) {
          // Erro pode ter campo associado
          if (result.field) {
            setErrors({ [result.field]: result.error });
          } else {
            setErrors({ _global: result.error });
          }
          return;
        }

        // Sucesso — fazer login automático
        const signInResult = await signIn('credentials', {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          window.location.href = targetUrl;
        } else {
          // Conta criada mas sign-in falhou — utilizador faz login manual
          window.location.href = `/entrar?registered=1&redirect=${encodeURIComponent(targetUrl)}`;
        }
      } catch (err) {
        console.error('[register] erro:', err);
        setErrors({ _global: 'Ocorreu um erro inesperado. Tenta novamente.' });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* OAuth Google — regista/entra numa só ação */}
      <GoogleAuthButton redirectTo={targetUrl} />
      <AuthDivider />

      {/* Honeypot escondido */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Não preencher
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
          />
        </label>
      </div>

      {/* Nome */}
      <div>
        <label
          htmlFor="reg-name"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Nome completo
        </label>
        <input
          id="reg-name"
          type="text"
          autoComplete="name"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.name ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="Maria Silva"
        />
        {errors.name && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="reg-email"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.email ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="o-teu-email@exemplo.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.email}
          </p>
        )}
      </div>

      {/* Telefone */}
      <div>
        <label
          htmlFor="reg-phone"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Telefone <span style={{ color: '#5A5A5A' }}>(opcional)</span>
        </label>
        <input
          id="reg-phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.phone ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="912 345 678"
        />
        {errors.phone && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.phone}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="reg-password"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Password
        </label>
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
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

      {/* Confirmar password */}
      <div>
        <label
          htmlFor="reg-password-confirm"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Confirmar password
        </label>
        <PasswordInput
          id="reg-password-confirm"
          autoComplete="new-password"
          required
          value={form.passwordConfirm}
          onChange={(e) => update('passwordConfirm', e.target.value)}
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

      {/* Aceitar termos */}
      <div className="space-y-3 pt-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => update('acceptTerms', e.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-2 disabled:opacity-50"
            style={{ accentColor: '#1F3D2E' }}
          />
          <span className="text-sm" style={{ color: '#5A5A5A' }}>
            Li e aceito os{' '}
            <Link
              href="/termos"
              target="_blank"
              className="underline-offset-2 hover:underline"
              style={{ color: '#1F3D2E' }}
            >
              termos de utilização
            </Link>{' '}
            e a{' '}
            <Link
              href="/privacidade"
              target="_blank"
              className="underline-offset-2 hover:underline"
              style={{ color: '#1F3D2E' }}
            >
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-xs" style={{ color: '#B23C3C' }}>
            {errors.acceptTerms}
          </p>
        )}

        {/* Marketing consent */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.marketingConsent}
            onChange={(e) => update('marketingConsent', e.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-2 disabled:opacity-50"
            style={{ accentColor: '#1F3D2E' }}
          />
          <span className="text-sm" style={{ color: '#5A5A5A' }}>
            Quero receber novidades e promoções por email.
          </span>
        </label>
      </div>

      {/* Erro global */}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          backgroundColor: '#1F3D2E',
          color: '#FAF7F2',
        }}
      >
        {isPending ? 'A criar conta...' : 'Criar conta'}
      </button>

      {/* Footer */}
      <p className="pt-2 text-center text-sm" style={{ color: '#5A5A5A' }}>
        Já tens conta?{' '}
        <Link
          href={`/entrar${redirectParam ? `?redirect=${encodeURIComponent(targetUrl)}` : ''}`}
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: '#1F3D2E' }}
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
