// 📄 src/components/ui/PasswordInput.tsx
/**
 * Chi Sublime — Input de password com olho (mostrar/esconder)
 * ============================================================
 *
 * Substituto direto dos <input type="password">: aceita as mesmas
 * props (className, style, value/onChange ou ref de react-hook-form)
 * e acrescenta o botão de visibilidade. `dark` ajusta a cor do ícone
 * para fundos escuros (login do admin).
 */

'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Ícone claro para formulários sobre fundo escuro */
  dark?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ dark = false, className, ...props }, ref) {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(className, 'pr-12')}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Esconder password' : 'Mostrar password'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center transition-opacity hover:opacity-80"
          style={{ color: dark ? 'rgba(250,247,242,0.65)' : '#8A8A8A' }}
        >
          {show ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
        </button>
      </div>
    );
  },
);
