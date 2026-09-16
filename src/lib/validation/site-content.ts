// 📄 src/lib/validation/site-content.ts
/**
 * Chi Sublime — Validação: conteúdo editável do site
 * ============================================================
 */

import { z } from 'zod';

export const GALLERY_MAX_IMAGES = 24;

export const galleryImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Imagem em falta')
    .max(500)
    .refine((v) => v.startsWith('/') || /^https:\/\//.test(v), 'URL da imagem inválido'),
  alt: z.object({
    pt: z.string().trim().max(150, 'Descrição demasiado longa').default(''),
    en: z.string().trim().max(150, 'Descrição demasiado longa').default(''),
  }),
});

export const saveHomeGallerySchema = z.object({
  images: z
    .array(galleryImageSchema)
    .max(GALLERY_MAX_IMAGES, `Máximo de ${GALLERY_MAX_IMAGES} imagens`),
});

export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
export type SaveHomeGalleryInput = z.infer<typeof saveHomeGallerySchema>;
