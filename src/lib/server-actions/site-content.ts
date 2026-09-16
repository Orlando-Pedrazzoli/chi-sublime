// 📄 src/lib/server-actions/site-content.ts
'use server';

/**
 * Chi Sublime — Server Actions: conteúdo editável do site
 * ============================================================
 *
 * Por agora: galeria da homepage (SiteContent 'home.gallery').
 * Grava a lista completa de uma vez (ordem = ordem do array),
 * regista auditoria e revalida a homepage.
 */

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth';
import { SiteContent, logAudit } from '@/lib/models';
import { ok, fail, type ActionResult } from '@/types/common';
import { saveHomeGallerySchema } from '@/lib/validation/site-content';
import { HOME_GALLERY_KEY } from '@/lib/content/gallery';

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session.user;
}

export async function saveHomeGalleryAction(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdminSession();
  if (!admin) return fail('unauthorized', 'Não autorizado');

  const parsed = saveHomeGallerySchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const position = typeof first?.path[1] === 'number' ? ` (imagem ${first.path[1] + 1})` : '';
    return fail('validation', `${first?.message ?? 'Dados inválidos'}${position}`);
  }

  const { images } = parsed.data;

  try {
    await connectDB();
    await SiteContent.findOneAndUpdate(
      { key: HOME_GALLERY_KEY },
      {
        $set: {
          type: 'list',
          label: 'Galeria da homepage',
          helperText: 'Imagens da secção "O nosso espaço". A ordem define o layout.',
          content: { pt: { images } },
          active: true,
          updatedBy: new mongoose.Types.ObjectId(admin.id),
        },
      },
      { upsert: true, runValidators: true },
    );
  } catch (err) {
    console.error('[saveHomeGalleryAction]', err);
    return fail('server', 'Erro ao guardar a galeria. Tenta novamente.');
  }

  await logAudit({
    action: 'update',
    resource: 'site-content',
    resourceLabel: 'Galeria da homepage',
    userId: new mongoose.Types.ObjectId(admin.id),
    userName: admin.name,
    userEmail: admin.email,
    userRole: 'admin',
    message: `Galeria da homepage atualizada (${images.length} imagens)`,
    severity: 'info',
  });

  revalidatePath('/');
  revalidatePath('/admin/galeria');
  return ok({ count: images.length });
}
