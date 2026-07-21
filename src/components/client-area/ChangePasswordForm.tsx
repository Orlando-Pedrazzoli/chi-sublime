'use client';

import { useState, useTransition } from 'react';
import { Shield } from 'lucide-react';
import { changePassword } from '@/lib/server-actions/auth';
import { PasswordInput } from '@/components/ui/PasswordInput';

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      });

      if (result.success) {
        setSuccessMessage('Password alterada com sucesso.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        if (result.field) {
          setErrors({ [result.field]: result.error });
        } else {
          setErrors({ _global: result.error });
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="current-password"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Password actual
        </label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: errors.currentPassword ? '#B23C3C' : 'rgba(31,61,46,0.2)',
          }}
        />
        {errors.currentPassword && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.currentPassword}
          </p>
        )}
      </div>

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
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: errors.newPassword ? '#B23C3C' : 'rgba(31,61,46,0.2)',
          }}
          placeholder="Pelo menos 8 caracteres com letras e números"
        />
        {errors.newPassword && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.newPassword}
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
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: errors.newPasswordConfirm ? '#B23C3C' : 'rgba(31,61,46,0.2)',
          }}
        />
        {errors.newPasswordConfirm && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.newPasswordConfirm}
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

      {successMessage && (
        <div
          role="status"
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(151,196,89,0.3)',
            backgroundColor: 'rgba(151,196,89,0.08)',
            color: '#5C8A2F',
          }}
        >
          {successMessage}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <Shield size={14} strokeWidth={1.5} />
          {isPending ? 'A alterar...' : 'Alterar password'}
        </button>
      </div>
    </form>
  );
}
