// 📄 src/lib/content/gallery.ts
/**
 * Chi Sublime — Galeria da homepage (leitura)
 * ============================================================
 *
 * Fonte: SiteContent com key 'home.gallery'.
 *
 * Formato gravado (as imagens não dependem do idioma, por isso
 * vivem todas em content.pt; só o alt é bilingue):
 *   content: {
 *     pt: { images: [{ url, alt: { pt, en } }, ...] }
 *   }
 *
 * Sem documento na BD (ou erro de ligação) → DEFAULT_GALLERY,
 * que são as fotos originais do site. Um documento gravado com
 * zero imagens é respeitado: a secção fica escondida.
 */

import { connectDB } from '@/lib/db/connect';
import { SiteContent } from '@/lib/models';
import { galleryImageSchema } from '@/lib/validation/site-content';

export const HOME_GALLERY_KEY = 'home.gallery';

export type GalleryImage = {
  url: string;
  alt: { pt: string; en: string };
};

export const DEFAULT_GALLERY: GalleryImage[] = [
  { url: '/images/philosophy.jpg', alt: { pt: 'Espaço Chi Sublime', en: 'The Chi Sublime space' } },
  { url: '/images/hero.jpg', alt: { pt: 'Interior do salão', en: 'Salon interior' } },
  { url: '/images/services/detalhe4.jpg', alt: { pt: 'Cabeleireiro', en: 'Hair' } },
  { url: '/images/services/detalhe5.jpg', alt: { pt: 'Maquilhagem', en: 'Make-up' } },
  { url: '/images/services/detalhe8.jpg', alt: { pt: 'Sobrancelhas', en: 'Brows' } },
  {
    url: '/images/salao_novo.jpg',
    alt: { pt: 'Receção do Chi Sublime', en: 'Chi Sublime reception' },
  },
  { url: '/images/services/detalhe3.jpg', alt: { pt: 'Depilação', en: 'Waxing' } },
  { url: '/images/services/detalhe7.jpg', alt: { pt: 'Unhas', en: 'Nails' } },
];

export type HomeGalleryResult = {
  images: GalleryImage[];
  /** true quando ainda não existe nada gravado e se está a usar DEFAULT_GALLERY */
  isDefault: boolean;
  updatedAt?: string;
};

export async function getHomeGallery(): Promise<HomeGalleryResult> {
  try {
    await connectDB();
    const doc = await SiteContent.findOne({ key: HOME_GALLERY_KEY }).lean();
    if (!doc) return { images: DEFAULT_GALLERY, isDefault: true };

    const raw = (doc.content?.pt as { images?: unknown } | undefined)?.images;
    const images = Array.isArray(raw)
      ? raw.flatMap((item) => {
          const parsed = galleryImageSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        })
      : [];

    return {
      images: doc.active === false ? [] : images,
      isDefault: false,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    };
  } catch (err) {
    console.error('[getHomeGallery]', err);
    return { images: DEFAULT_GALLERY, isDefault: true };
  }
}
