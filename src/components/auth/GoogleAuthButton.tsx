// 📄 src/components/auth/GoogleAuthButton.tsx
'use client';

/**
 * Chi Sublime — "Continuar com Google"
 * ============================================================
 *
 * Botão de OAuth seguindo as guidelines de branding da Google:
 * fundo branco, borda neutra, logótipo "G" oficial multicolor
 * e o texto recomendado "Continuar com Google" (serve login E
 * registo — o NextAuth cria a conta na primeira entrada).
 *
 * `redirectTo` preserva o destino (ex.: fluxo de marcação):
 * /entrar?redirect=/reservar/confirmar → volta lá após o OAuth.
 *
 * Estilos críticos inline (regra do projeto).
 */

import { useState } from 'react';
import { signIn } from 'next-auth/react';

/** Logótipo G oficial (SVG multicolor, guidelines Google) */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export type GoogleAuthButtonProps = {
  /** URL de destino após autenticação (default: /conta) */
  redirectTo?: string;
  /** Texto do botão (default: "Continuar com Google") */
  label?: string;
};

export function GoogleAuthButton({ redirectTo = '/conta', label }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // redirect: true (default) — o NextAuth trata do round-trip OAuth
    await signIn('google', { callbackUrl: redirectTo });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full transition-all hover:-translate-y-[1px] hover:shadow-sm disabled:cursor-wait disabled:opacity-70"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        height: '46px',
        padding: '0 16px',
        borderRadius: '8px',
        border: '1px solid #dadce0',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        fontWeight: 500,
        color: '#1a1a1a',
        whiteSpace: 'nowrap',
      }}
    >
      <GoogleG />
      {loading ? 'A redirecionar…' : (label ?? 'Continuar com Google')}
    </button>
  );
}

/** Divisor "ou" entre o OAuth e o formulário de email */
export function AuthDivider({ dark }: { dark?: boolean }) {
  const line = dark ? 'rgba(250,247,242,0.2)' : '#e8e4da';
  const text = dark ? 'rgba(250,247,242,0.6)' : '#9a9a9a';
  return (
    <div
      role="separator"
      style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}
    >
      <span style={{ flex: 1, height: '1px', backgroundColor: line }} />
      <span
        style={{
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: text,
        }}
      >
        ou com email
      </span>
      <span style={{ flex: 1, height: '1px', backgroundColor: line }} />
    </div>
  );
}
