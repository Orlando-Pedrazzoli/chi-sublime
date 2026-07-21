// 📄 src/lib/server-actions/admin-users.ts
'use server';

/**
 * Chi Sublime — Gestão de utilizadores administradores
 * ============================================================
 *
 * Definições » Utilizadores. Regras de segurança:
 *  - Só admins acedem (requireAdminSession)
 *  - Um admin não pode desativar-se a si próprio
 *  - O último admin ativo nunca pode ser desativado (lockout)
 *  - Passwords novas: mínimo 8 caracteres, guardadas como hash
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { User, logAudit } from '@/lib/models';
import { hashPassword } from '@/lib/auth/password';
import { ok, fail, type ActionResult } from '@/types/common';

// ============================================================
// Helpers
// ============================================================

async function requireAdminSession() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return null;
  return session.user;
}

export type AdminUserDTO = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
};

// ============================================================
// LISTAR
// ============================================================

export async function listAdminUsersAction(): Promise<ActionResult<{ users: AdminUserDTO[] }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  await connectDB();
  const users = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).lean();

  return ok({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      active: u.active,
      createdAt: new Date(u.createdAt).toISOString(),
    })),
  });
}

// ============================================================
// CRIAR
// ============================================================

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  email: z.string().trim().toLowerCase().email('Email inválido').max(200),
  password: z.string().min(8, 'Password: mínimo 8 caracteres').max(100),
});

export async function createAdminUserAction(
  input: unknown,
): Promise<ActionResult<{ user: AdminUserDTO }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail('validation', first?.message ?? 'Dados inválidos');
  }
  const d = parsed.data;

  await connectDB();

  const existing = await User.exists({ email: d.email });
  if (existing) return fail('conflict', 'Já existe uma conta com este email');

  const passwordHash = await hashPassword(d.password);
  const user = await User.create({
    name: d.name,
    email: d.email,
    passwordHash,
    role: 'admin',
    active: true,
  });

  await logAudit({
    action: 'create',
    resource: 'user',
    resourceId: String(user._id),
    resourceLabel: d.email,
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Novo administrador criado: ${d.name} <${d.email}>`,
    severity: 'warning',
  });

  revalidatePath('/admin/definicoes/utilizadores');
  return ok({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      active: true,
      createdAt: new Date(user.createdAt).toISOString(),
    },
  });
}

// ============================================================
// ATIVAR / DESATIVAR
// ============================================================

const setActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
});

export async function setAdminActiveAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) return fail('validation', 'Dados inválidos');
  const { userId, active } = parsed.data;

  await connectDB();

  const target = await User.findOne({ _id: userId, role: 'admin' });
  if (!target) return fail('not_found', 'Administrador não encontrado');

  if (!active) {
    // Nunca deixar o painel sem administradores
    if (String(target._id) === admin.id) {
      return fail('forbidden', 'Não podes desativar a tua própria conta');
    }
    const activeAdmins = await User.countDocuments({ role: 'admin', active: true });
    if (activeAdmins <= 1) {
      return fail('forbidden', 'Não é possível desativar o último administrador ativo');
    }
  }

  target.active = active;
  await target.save();

  await logAudit({
    action: 'update',
    resource: 'user',
    resourceId: String(target._id),
    resourceLabel: target.email,
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Administrador ${target.email} ${active ? 'ativado' : 'desativado'}`,
    severity: 'warning',
  });

  revalidatePath('/admin/definicoes/utilizadores');
  return ok({ ok: true });
}
