// 📄 src/components/home/GalleryPreview.tsx
/**
 * Chi Sublime — GalleryPreview
 * ============================================================
 *
 * Masonry mantido, decoração removida: sem overlays verdes de
 * hover, sem gradientes. As fotos falam por si — apenas um
 * scale subtil. Link para o Instagram no header (prova social).
 *
 * i18n: getTranslations('home.gallery'). Os alts das imagens
 * são traduzidos (a11y + Google Imagens em ambos os idiomas)
 * via altKey → home.gallery.alts.*
 */

import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/shared/Reveal';

const GALLERY_ITEMS = [
  { src: '/images/philosophy.jpg', altKey: 'philosophy', span: 'tall' },
  { src: '/images/hero.jpg', altKey: 'hero', span: 'wide' },
  { src: '/images/services/detalhe4.jpg', altKey: 'hair', span: 'default' },
  { src: '/images/services/detalhe5.jpg', altKey: 'makeup', span: 'default' },
  { src: '/images/services/detalhe8.jpg', altKey: 'brows', span: 'default' },
  // Posição deliberada: como 6º item 'tall', o auto-placement do
  // grid coloca-a na coluna 4, linhas 2-3 — o vazio que existia
  { src: '/images/salao_novo.jpg', altKey: 'reception', span: 'tall' },
  { src: '/images/services/detalhe3.jpg', altKey: 'waxing', span: 'wide' },
  { src: '/images/services/detalhe7.jpg', altKey: 'nails', span: 'default' },
] as const;

const SPAN_CLASSES: Record<string, string> = {
  tall: 'row-span-2',
  wide: 'col-span-2',
  default: '',
};

export async function GalleryPreview() {
  const t = await getTranslations('home.gallery');

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

        {/* Grid masonry */}
        <div className="grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {GALLERY_ITEMS.map((item, i) => (
            <Reveal key={item.src} delay={(i % 4) * 0.06} className={SPAN_CLASSES[item.span]}>
              <div className="group relative h-full w-full overflow-hidden">
                <Image
                  src={item.src}
                  alt={t(`alts.${item.altKey}`)}
                  fill
                  quality={80}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
