// 📄 src/components/home/ServicesPreview.tsx
/**
 * Chi Sublime — ServicesPreview ("A Carta")
 * ============================================================
 *
 * Elemento assinatura do site: os serviços como uma carta
 * editorial — linhas horizontais em vez de cards.
 *
 * Desktop: nome da categoria em serif display; a imagem da
 * categoria revela-se à direita no hover (CSS puro, sem JS).
 * Mobile: thumbnail sempre visível à esquerda da linha.
 *
 * Sobre fundo verde profundo, mantendo o contraste da home.
 *
 * i18n:
 * - UI via getTranslations('home.services')
 * - Nome da categoria (DB) via localizedField() com fallback PT
 * - Descrições por slug nos JSONs (t.has → fallback genérico)
 * - Contador com plural ICU: "{count, plural, one {...} other {...}}"
 */

import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { Reveal } from '@/components/shared/Reveal';

const CATEGORY_IMAGES: Record<string, string> = {
  cabelereiro: '/images/services/detalhe6.jpg',
  sobrancelhas: '/images/services/sobrancelhas.jpg',
  maquilhagem: '/images/services/maquilhagem.jpg',
  unhas: '/images/services/unhas.jpg',
  depilacao: '/images/services/depilacao.jpg',
};

type CategoryCard = {
  slug: string;
  title: string;
  count: number;
  image: string;
};

async function getCategoriesWithCount(locale: Locale): Promise<CategoryCard[]> {
  await connectDB();

  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();

  const cards = await Promise.all(
    categories.map(async (cat) => {
      const count = await Service.countDocuments({
        categoryId: cat._id,
        active: true,
      });

      return {
        slug: cat.slug,
        title: localizedField(cat.name, locale),
        count,
        image: CATEGORY_IMAGES[cat.slug] ?? '/images/services/cabelereiro.jpg',
      } satisfies CategoryCard;
    }),
  );

  return cards;
}

export async function ServicesPreview() {
  const locale = (await getLocale()) as Locale;
  const [t, categories] = await Promise.all([
    getTranslations('home.services'),
    getCategoriesWithCount(locale),
  ]);

  /** Descrição por slug com fallback genérico (slugs novos na DB não partem o site) */
  const description = (slug: string) =>
    t.has(`descriptions.${slug}`) ? t(`descriptions.${slug}`) : t('descriptions.fallback');

  return (
    <section id="services" className="bg-chi-green-deep text-chi-cream py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header */}
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <span className="eyebrow text-chi-gold mb-8 block">{t('eyebrow')}</span>
            <h2 className="text-display-lg max-w-2xl font-serif text-balance">{t('title')}</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-chi-cream/70 max-w-sm text-base leading-[1.85]">{t('intro')}</p>
          </Reveal>
        </div>

        {/* A carta — linhas editoriais */}
        <div className="border-chi-cream/15 border-t">
          {categories.map((cat, i) => (
            <Reveal key={cat.slug} delay={i * 0.06} as="div">
              <Link
                href={`/servicos/${cat.slug}`}
                className="group border-chi-cream/15 relative grid grid-cols-[64px_1fr_auto] items-center gap-5 border-b py-6 transition-colors duration-500 md:grid-cols-[1fr_minmax(0,420px)_auto] md:gap-10 md:overflow-hidden md:py-10"
              >
                {/* Thumbnail — sempre visível no mobile; em desktop
                    revela-se DENTRO da linha (overflow cortado no Link),
                    no espaço vazio entre o título e a descrição —
                    nunca sobre texto. */}
                <div className="relative aspect-square w-16 overflow-hidden md:absolute md:inset-y-3 md:left-[40%] md:z-10 md:aspect-auto md:w-44 md:opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    quality={85}
                    sizes="(max-width: 768px) 64px, 176px"
                    className="object-cover md:scale-105 md:transition-transform md:duration-700 md:group-hover:scale-100"
                  />
                </div>

                {/* Nome da categoria */}
                <div className="min-w-0">
                  <h3 className="group-hover:text-chi-gold font-serif text-2xl leading-tight transition-colors duration-400 sm:text-3xl md:text-5xl">
                    {cat.title}
                  </h3>
                  <span className="text-chi-cream/45 mt-2 block text-[10px] tracking-[0.25em] uppercase md:mt-3">
                    {t('count', { count: cat.count })}
                  </span>
                </div>

                {/* Descrição — só a partir de md */}
                <p className="text-chi-cream/60 hidden text-sm leading-[1.75] md:block">
                  {description(cat.slug)}
                </p>

                {/* Ação: desktop — label revelado no hover;
                    mobile — seta discreta (affordance de toque) */}
                <span className="hidden items-center gap-2 md:inline-flex">
                  <span className="text-chi-gold -translate-x-2 text-[10px] tracking-[0.25em] uppercase opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                    {t('viewServices')} →
                  </span>
                </span>
                <span className="text-chi-cream/50 text-xl md:hidden" aria-hidden>
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* CTA de rodapé da secção */}
        <Reveal delay={0.1}>
          <div className="mt-16 flex justify-center md:mt-20">
            <Link
              href="/reservar"
              className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
              style={{ color: '#1F3D2E' }}
            >
              {t('cta')}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
