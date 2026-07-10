'use server';

// 📄 src/lib/server-actions/auth.ts

import { nanoid } from 'nanoid';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/models/User';
import { Client } from '@/lib/models/Client';
import { logAudit } from '@/lib/models/AuditLog';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email/send';
import {
  registerSchema,
  requestResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type RegisterInput,
  type RequestResetInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
} from '@/lib/validation/auth';
import { getCurrentUser } from '@/lib/auth/permissions';

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; field?: string };

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function generateResetToken(): { token: string; expires: Date } {
  return {
    token: nanoid(32),
    expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

export async function registerUser(
  input: RegisterInput,
): Promise<ActionResult<{ userId: string; clientId: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      success: false,
      error: first.message,
      field: first.path.join('.'),
    };
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: false, error: 'Erro de validação' };
  }

  const { name, email, phone, password, marketingConsent } = parsed.data;

  await connectDB();

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return {
      success: false,
      error: 'Já existe uma conta com este email',
      field: 'email',
    };
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar password',
    };
  }

  let clientDoc = await Client.findOne({
    email,
    userId: { $exists: false },
    active: true,
  });

  let clientCreated = false;

  if (!clientDoc) {
    try {
      clientDoc = await Client.create({
        name,
        phone: phone || '+351000000000',
        email,
        source: 'online',
        marketingConsent,
        active: true,
      });
      clientCreated = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cliente';
      return { success: false, error: message };
    }
  }

  let userDoc;
  try {
    userDoc = await User.create({
      email,
      passwordHash,
      name,
      phone,
      role: 'client',
      clientId: clientDoc._id,
      active: true,
    });
  } catch (err) {
    if (clientCreated && clientDoc) {
      await Client.deleteOne({ _id: clientDoc._id }).catch(() => {});
    }
    const message = err instanceof Error ? err.message : 'Erro ao criar utilizador';
    return { success: false, error: message };
  }

  try {
    await Client.updateOne({ _id: clientDoc._id }, { $set: { userId: userDoc._id } });
  } catch (err) {
    console.error('[register] failed to link Client->User:', err);
  }

  await logAudit({
    action: 'create',
    resource: 'user',
    resourceId: userDoc._id.toString(),
    resourceLabel: userDoc.name,
    userId: userDoc._id,
    userName: userDoc.name,
    userEmail: userDoc.email,
    userRole: userDoc.role,
    message: `Novo registo de cliente: ${userDoc.email}`,
    severity: 'info',
    metadata: {
      clientCreated,
      clientId: clientDoc._id.toString(),
      autoMatched: !clientCreated,
    },
  });

  // Email de boas-vindas — não bloqueia nem reverte o registo se falhar.
  try {
    await sendWelcomeEmail({ to: userDoc.email, name: userDoc.name });
  } catch (err) {
    console.error('[register] welcome email failed:', err);
  }

  return {
    success: true,
    data: {
      userId: userDoc._id.toString(),
      clientId: clientDoc._id.toString(),
    },
  };
}

export async function requestPasswordReset(input: RequestResetInput): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path.join('.'),
    };
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: true };
  }

  const { email } = parsed.data;

  await connectDB();

  const user = await User.findOne({ email, active: true });

  if (!user) {
    return { success: true };
  }

  const { token, expires } = generateResetToken();
  user.passwordResetToken = token;
  user.passwordResetExpires = expires;

  try {
    await user.save();
  } catch (err) {
    console.error('[reset] failed to save token:', err);
    return { success: false, error: 'Erro ao processar pedido' };
  }

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    token,
  });

  await logAudit({
    action: 'access',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: user.name,
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    message: `Pedido de recuperação de password: ${user.email}`,
    severity: 'info',
  });

  return { success: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path.join('.'),
    };
  }

  const { token, password } = parsed.data;

  await connectDB();

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
    active: true,
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return { success: false, error: 'Token inválido ou expirado' };
  }

  let newHash: string;
  try {
    newHash = await hashPassword(password);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar password',
    };
  }

  user.passwordHash = newHash;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  try {
    await user.save();
  } catch (err) {
    console.error('[reset] failed to save:', err);
    return { success: false, error: 'Erro ao guardar nova password' };
  }

  await logAudit({
    action: 'update',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: user.name,
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    message: `Password redefinida via token: ${user.email}`,
    severity: 'warning',
  });

  return { success: true };
}

export async function changePassword(input: ChangePasswordInput): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: 'Não autenticado' };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      field: parsed.error.issues[0].path.join('.'),
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  await connectDB();

  const user = await User.findById(session.id).select('+passwordHash');
  if (!user || !user.passwordHash) {
    return { success: false, error: 'Utilizador não encontrado' };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    await logAudit({
      action: 'update',
      resource: 'user',
      resourceId: user._id.toString(),
      resourceLabel: user.name,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      message: `Tentativa falhada de mudança de password: ${user.email}`,
      severity: 'warning',
    });

    return {
      success: false,
      error: 'Password actual incorrecta',
      field: 'currentPassword',
    };
  }

  let newHash: string;
  try {
    newHash = await hashPassword(newPassword);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao processar password',
    };
  }

  user.passwordHash = newHash;
  await user.save();

  await logAudit({
    action: 'update',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: user.name,
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    message: `Password alterada pelo utilizador: ${user.email}`,
    severity: 'warning',
  });

  return { success: true };
}

// ============================================================================
// UPDATE PROFILE
// ============================================================================

export async function updateProfileAction(input: {
  name: string;
  phone?: string;
}): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) {
    return { success: false, error: 'Não autenticado' };
  }

  const name = input.name?.trim();
  const phone = input.phone?.trim() || undefined;

  if (!name || name.length < 2 || name.length > 120) {
    return {
      success: false,
      error: 'Nome com pelo menos 2 caracteres',
      field: 'name',
    };
  }

  if (phone) {
    const phoneRegex = /^(?:(?:\+|00)351)?\s?[29]\d{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return {
        success: false,
        error: 'Telefone português inválido',
        field: 'phone',
      };
    }
  }

  await connectDB();

  const user = await User.findById(session.id);
  if (!user) {
    return { success: false, error: 'Utilizador não encontrado' };
  }

  const oldName = user.name;
  user.name = name;
  if (phone !== undefined) {
    user.phone = phone;
  }

  await user.save();

  // Sincronizar com Client (ficha do salão)
  if (user.clientId) {
    await Client.updateOne(
      { _id: user.clientId },
      {
        $set: {
          name,
          ...(phone ? { phone } : {}),
        },
      },
    );
  }

  await logAudit({
    action: 'update',
    resource: 'user',
    resourceId: user._id.toString(),
    resourceLabel: user.name,
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    message: `Perfil actualizado: ${user.email}`,
    severity: 'info',
    metadata: {
      changedName: oldName !== name,
      changedPhone: !!phone,
    },
  });

  return { success: true };
}
