// 📄 src/components/admin/settings/AdminUsersManager.tsx
/**
 * Chi Sublime — Definições » Utilizadores
 * ============================================================
 *
 * Lista os administradores do painel, permite criar novos e
 * ativar/desativar acessos. As regras de segurança (não desativar
 * a própria conta nem o último admin) vivem na server action.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import {
  createAdminUserAction,
  setAdminActiveAction,
  type AdminUserDTO,
} from '@/lib/server-actions/admin-users';

type NewAdminForm = { name: string; email: string; password: string };

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function AdminUsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUserDTO[];
  currentUserId: string;
}) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserDTO[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewAdminForm>();

  async function onCreate(values: NewAdminForm) {
    const result = await createAdminUserAction(values);
    if (result.success) {
      setUsers((prev) => [...prev, result.data.user]);
      toast.success(`Administrador ${result.data.user.name} criado.`);
      reset();
      setShowForm(false);
    } else {
      toast.error(result.error.message);
    }
  }

  async function toggleActive(user: AdminUserDTO) {
    setBusyId(user.id);
    const result = await setAdminActiveAction({ userId: user.id, active: !user.active });
    setBusyId(null);
    if (result.success) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !user.active } : u)));
      toast.success(`${user.name} ${user.active ? 'desativado' : 'ativado'}.`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Lista */}
      <ul
        className="divide-y overflow-hidden rounded-lg border bg-white"
        style={{ borderColor: 'rgba(31,61,46,0.08)' }}
      >
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5"
              style={{ borderColor: 'rgba(31,61,46,0.06)' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: u.active ? '#D4AF6E' : 'rgba(90,90,90,0.15)',
                  color: u.active ? '#1F3D2E' : '#8A8A8A',
                }}
              >
                {u.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join('')}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: '#1A1A1A' }}>
                  {u.name}
                  {isSelf && (
                    <span className="ml-2 text-xs italic" style={{ color: '#8A8A8A' }}>
                      (tu)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs" style={{ color: '#5A5A5A' }}>
                  {u.email} · desde {dateFmt.format(new Date(u.createdAt))}
                </p>
              </div>

              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                style={{
                  backgroundColor: u.active ? 'rgba(151,196,89,0.18)' : 'rgba(90,90,90,0.12)',
                  color: u.active ? '#3A5A1F' : '#6A6A6A',
                }}
              >
                {u.active ? 'Ativo' : 'Inativo'}
              </span>

              {!isSelf && (
                <button
                  type="button"
                  disabled={busyId === u.id}
                  onClick={() => toggleActive(u)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(31,61,46,0.2)',
                    color: u.active ? '#8A3A2A' : '#1F3D2E',
                  }}
                >
                  {u.active ? (
                    <>
                      <ShieldOff size={13} /> Desativar
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={13} /> Ativar
                    </>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Criar novo */}
      {showForm ? (
        <form
          onSubmit={handleSubmit(onCreate)}
          className="border-chi-border space-y-4 rounded-lg border bg-white p-6"
        >
          <h3 className="font-serif text-lg" style={{ color: '#1A1A1A' }}>
            Novo administrador
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                {...register('name', { required: 'Nome obrigatório' })}
                placeholder="Nome completo"
              />
              {errors.name && <p className="text-chi-danger mt-1 text-xs">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                {...register('email', { required: 'Email obrigatório' })}
                placeholder="email@exemplo.pt"
              />
              {errors.email && (
                <p className="text-chi-danger mt-1 text-xs">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="new-password">Password provisória</Label>
            <Input
              id="new-password"
              type="password"
              {...register('password', {
                required: 'Password obrigatória',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && (
              <p className="text-chi-danger mt-1 text-xs">{errors.password.message}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: '#8A8A8A' }}>
              Partilha a password provisória em segurança — a pessoa deve trocá-la em Definições »
              Segurança no primeiro acesso.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A criar…' : 'Criar administrador'}
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" onClick={() => setShowForm(true)}>
          <UserPlus size={15} className="mr-2" />
          Novo administrador
        </Button>
      )}
    </div>
  );
}
