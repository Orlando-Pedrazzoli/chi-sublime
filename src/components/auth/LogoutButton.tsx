'use client';

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

type Variant = 'sidebar' | 'menu' | 'inline';

type LogoutButtonProps = {
  variant?: Variant;
  /**
   * URL para onde redireccionar após logout. Default: homepage.
   */
  redirectTo?: string;
  className?: string;
  label?: string;
};

export function LogoutButton({
  variant = 'inline',
  redirectTo = '/',
  className,
  label = 'Sair',
}: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOut({ redirect: false });
      window.location.href = redirectTo;
    });
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={
          className ??
          'flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm tracking-wide transition-colors hover:bg-white/5 disabled:opacity-50'
        }
        style={{ color: '#FAF7F2' }}
      >
        <LogOut size={18} />
        <span>{isPending ? 'A sair...' : label}</span>
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={
          className ??
          'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-black/5 disabled:opacity-50'
        }
        style={{ color: '#1A1A1A' }}
      >
        <LogOut size={16} />
        <span>{isPending ? 'A sair...' : label}</span>
      </button>
    );
  }

  // inline (default) — botão simples
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={
        className ??
        'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
      }
      style={{
        backgroundColor: '#1F3D2E',
        color: '#FAF7F2',
      }}
    >
      {isPending ? 'A sair...' : label}
    </button>
  );
}
