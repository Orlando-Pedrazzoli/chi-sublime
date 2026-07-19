// 📄 src/components/home/Philosophy.tsx
/**
 * Chi Sublime — Philosophy
 * ============================================================
 *
 * Secção-statement: a citação É a secção, em corpo display,
 * sem aspas decorativas nem moldura dourada offset.
 * Layout assimétrico: texto largo à esquerda, imagem alta à
 * direita com legenda — ritmo diferente do resto da página.
 *
 * i18n: Server Component com getTranslations('home.philosophy').
 */

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/shared/Reveal';

export async function Philosophy() {
  const t = await getTranslations('home.philosophy');

  return (
    <section className="bg-chi-cream py-28 md:py-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 md:grid-cols-[1.4fr_1fr] md:gap-24 md:px-12">
        {/* Coluna de texto */}
        <div className="flex flex-col justify-center">
          <Reveal>
            <span className="eyebrow text-chi-gold-deep mb-10 block">{t('eyebrow')}</span>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-chi-green-deep text-display-lg mb-12 max-w-2xl font-serif text-balance">
              {t('title')}
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="max-w-lg">
              <p className="text-chi-charcoal-soft mb-6 text-base leading-[1.9] md:text-lg">
                {t('p1')}
              </p>
              <p className="text-chi-charcoal-soft text-base leading-[1.9] md:text-lg">{t('p2')}</p>
            </div>
          </Reveal>
        </div>

        {/* Coluna de imagem — alta, com legenda editorial */}
        <Reveal delay={0.15} as="figure" className="m-0">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src="/images/philosophy.jpg"
              alt={t('imageAlt')}
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 38vw"
              className="object-cover"
            />
          </div>
          <figcaption className="text-chi-charcoal-light mt-4 flex items-baseline justify-between text-[11px] tracking-[0.18em] uppercase">
            <span>{t('captionLeft')}</span>
            <span>{t('captionRight')}</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
