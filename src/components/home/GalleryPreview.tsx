// 📄 src/components/home/GalleryPreview.tsx
/**
 * Chi Sublime — GalleryPreview
 * ============================================================
 *
 * Secção "O nosso espaço". As imagens vêm do admin (/admin/galeria,
 * SiteContent 'home.gallery'), com fallback para as fotos originais
 * enquanto nada for gravado. Zero imagens gravadas → secção oculta.
 *
 * Layout: spans calculados por getGalleryLayout() a partir da
 * posição e do total — 2 colunas sem buracos no telemóvel e mosaico
 * de 4 colunas em desktop, qualquer que seja o número de imagens.
 *
 * A altura das linhas é inline (clamp) para acompanhar a largura do
 * ecrã no telemóvel e estabilizar a 240px em desktop, sem depender
 * de classes arbitrárias que o build de produção possa descartar.
 *
 * i18n: textos em home.gallery; alt bilingue com fallback PT.
 */

import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { getHomeGallery } from '@/lib/content/gallery';
import { getGalleryLayout, gallerySpanClasses } from '@/lib/utils/gallery-layout';
import { isOptimizableImage } from '@/lib/utils/image';
import { localizedField } from '@/lib/utils/localized';
import { Reveal } from '@/components/shared/Reveal';

export async function GalleryPreview() {
  const locale = (await getLocale()) as Locale;
  const [t, { images }] = await Promise.all([getTranslations('home.gallery'), getHomeGallery()]);

  if (images.length === 0) return null;

  const layout = getGalleryLayout(images.length);

  return (
    <section id="gallery" className="bg-chi-sand py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <span className="eyebrow text-chi-gold-deep mb-8 block">{t('eyebrow')}</span>
            <h2 className="text-chi-green-deep text-display-lg max-w-xl font-serif text-balance">
              {t('title')}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link
              href="https://www.instagram.com/chiptsublime/"
              target="_blank"
              rel="noopener noreferrer"
              className="group text-chi-charcoal-soft inline-flex items-center gap-3 text-xs font-medium tracking-[0.22em] uppercase"
            >
              <span className="border-chi-charcoal-light/50 group-hover:border-chi-gold-deep border-b pb-1 transition-colors duration-300">
                {t('instagram')}
              </span>
              <span className="text-chi-gold-deep transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </Reveal>
        </div>

        {/* Mosaico — 2 colunas até lg, 4 colunas em desktop */}
        <div
          className="grid grid-flow-row grid-cols-2 lg:grid-cols-4"
          style={{ gridAutoRows: 'clamp(150px, 42vw, 240px)', gap: '0.75rem' }}
        >
          {images.map((image, i) => {
            const mobile = layout.mobile[i];
            const desktop = layout.desktop[i];
            const alt = localizedField(image.alt, locale) || 'Chi Sublime';
            // Imagens largas/grandes pedem mais resolução
            const sizes =
              desktop.col >= 2
                ? '(max-width: 1024px) 100vw, 50vw'
                : mobile.col === 2
                  ? '(max-width: 1024px) 100vw, 25vw'
                  : '(max-width: 1024px) 50vw, 25vw';

            return (
              <Reveal
                key={`${image.url}-${i}`}
                delay={(i % 4) * 0.06}
                className={gallerySpanClasses(mobile, desktop)}
              >
                <div className="group relative h-full w-full overflow-hidden">
                  <Image
                    src={image.url}
                    alt={alt}
                    fill
                    quality={80}
                    sizes={sizes}
                    unoptimized={!isOptimizableImage(image.url)}
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
