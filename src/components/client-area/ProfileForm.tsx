'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { Save } from 'lucide-react';
import { updateProfileAction } from '@/lib/server-actions/auth';

type ProfileFormProps = {
  initial: {
    name: string;
    email: string;
    phone?: string;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const { update: updateSession } = useSession();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    startTransition(async () => {
      const trimmedName = name.trim();

      const result = await updateProfileAction({
        name: trimmedName,
        phone: phone.trim() || undefined,
      });

      if (result.success) {
        // Forçar refresh do JWT/Session com o nome novo
        await updateSession({ name: trimmedName });

        setSuccessMessage('Perfil actualizado com sucesso.');

        // Reload completo para a navbar (Server Component) também actualizar
        setTimeout(() => window.location.reload(), 600);
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
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Email
        </label>
        <input
          type="email"
          value={initial.email}
          disabled
          className="w-full cursor-not-allowed rounded-md border bg-gray-50 px-4 py-3 text-base"
          style={{ borderColor: 'rgba(31,61,46,0.15)', color: '#5A5A5A' }}
        />
        <p className="mt-1 text-xs italic" style={{ color: '#5A5A5A' }}>
          O email não pode ser alterado. Contacta-nos se precisares de o mudar.
        </p>
      </div>

      <div>
        <label
          htmlFor="profile-name"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Nome completo
        </label>
        <input
          id="profile-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.name ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
        />
        {errors.name && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="profile-phone"
          className="mb-2 block text-xs tracking-[0.18em] uppercase"
          style={{ color: '#1A1A1A' }}
        >
          Telefone <span style={{ color: '#5A5A5A' }}>(opcional)</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border bg-white px-4 py-3 text-base transition outline-none focus:ring-2 disabled:opacity-50"
          style={{ borderColor: errors.phone ? '#B23C3C' : 'rgba(31,61,46,0.2)' }}
          placeholder="+351 912 345 678"
        />
        {errors.phone && (
          <p className="mt-1 text-xs" style={{ color: '#B23C3C' }}>
            {errors.phone}
          </p>
        )}
        <p className="mt-1 text-xs italic" style={{ color: '#5A5A5A' }}>
          Usado para contactos sobre as tuas marcações.
        </p>
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
          className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
        >
          <Save size={14} strokeWidth={1.5} />
          {isPending ? 'A guardar...' : 'Guardar alterações'}
        </button>
      </div>
    </form>
  );
}
