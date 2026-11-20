// 📄 src/app/servicos/[slug]/page.tsx
/**
 * Chi Sublime — Serviços por categoria (página pública)
 * ============================================================
 *
 * A "carta" completa de uma categoria: lista editorial de
 * serviços com descrição, duração, preço e badge Popular.
 *
 * SEO:
 * - Title/H1 com a pesquisa local: "{Categoria} em Cascais".
 * - Cada serviço é um LINK para a sua página própria
 *   (/servicos/{categoria}/{serviço}) — é assim que o Google
 *   descobre e dá peso às páginas de serviço.
 * - JSON-LD válido: ItemList → ListItem → item: Service + Offer,
 *   com provider ligado ao salão por @id. (Antes os Service
 *   estavam diretamente no itemListElement com `position`, o que
 *   é inválido e era ignorado.)
 * - Slugs antigos (ex.: "cabelereiro") fazem 301 para o slug
 *   correto assim que este existir na base de dados.
 *
 * CTA → /marcacoes?categoria={slug} (o ServicePicker abre essa
 * categoria via initialOpenSlug).
 */

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Reveal } from '@/components/shared/Reveal';
import { categoryImage } from '@/lib/content/category-images';
import {
  LEGACY_CATEGORY_SLUGS,
  absoluteUrl,
  breadcrumbJsonLd,
  categoryPath,
  formatDuration,
  formatPrice,
  jsonLdScript,
  serviceJsonLd,
  servicePath,
} from '@/lib/seo/site';

export const revalidate = 600;

// ============================================================
// DATA
// ============================================================

type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  popular: boolean;
};

async function getCategoryData(slug: string, locale: Locale) {
  await connectDB();

  const category = await Category.findOne({ slug, active: true }).lean();
  if (!category) return null;

  const [services, allCategories] = await Promise.all([
    Service.find({ categoryId: category._id, active: true })
      .sort({ order: 1, 'name.pt': 1 })
      .lean(),
    Category.find({ active: true }).sort({ order: 1 }).lean(),
  ]);

  return {
    category: {
      slug: category.slug,
      name: localizedField(category.name, locale),
      description: localizedField(category.description, locale) || undefined,
    },
    services: services.map(
      (s): ServiceRow => ({
        id: String(s._id),
        slug: s.slug,
        name: localizedField(s.name, locale),
        description: localizedField(s.description, locale) || undefined,
        duration: s.duration,
        price: s.price,
        popular: s.popular,
      }),
    ),
    otherCategories: allCategories
      .filter((c) => c.slug !== slug)
      .map((c) => ({ slug: c.slug, name: localizedField(c.name, locale) })),
  };
}

/** Slug antigo cujo slug novo já existe na BD → destino do 301 (senão null) */
async function resolveLegacySlug(slug: string): Promise<string | null> {
  const target = LEGACY_CATEGORY_SLUGS[slug];
  if (!target) return null;
  await connectDB();
  const exists = await Category.exists({ slug: target, active: true });
  return exists ? target : null;
}

// ============================================================
// METADATA
// ============================================================

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const [t, data] = await Promise.all([
    getTranslations('services.page'),
    getCategoryData(slug, locale),
  ]);
  if (!data) return { title: 'Serviços', robots: { index: false, follow: true } };

  const { category, services } = data;
  const title =
    locale === 'en'
      ? `${category.name} ${t('inCity')} — Services & Prices`
      : `${category.name} ${t('inCity')} — Serviços e Preços`;

  // Descrição com os serviços reais da carta (única por categoria)
  const sample = services
    .slice(0, 5)
    .map((s) => s.name)
    .join(', ');
  const description =
    category.description ??
    (locale === 'en'
      ? `${category.name} at Chi Sublime, Quinta da Bicuda, Cascais${sample ? `: ${sample}` : ''}. Prices, durations and online booking.`
      : `${category.name} no Chi Sublime, na Quinta da Bicuda, em Cascais${sample ? `: ${sample}` : ''}. Preços, duração e marcação online.`);

  return {
    title,
    description,
    alternates: { canonical: categoryPath(category.slug) },
    openGraph: {
      title: `${title} | Chi Sublime`,
      description,
      url: categoryPath(category.slug),
      images: [{ url: categoryImage(category.slug), alt: `${category.name} — Chi Sublime` }],
    },
  };
}

// ============================================================
// PAGE
// ============================================================

export default async function ServicoCategoriaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const [t, tNav, data] = await Promise.all([
    getTranslations('services.page'),
    getTranslations('nav'),
    getCategoryData(slug, locale),
  ]);

  if (!data) {
    const target = await resolveLegacySlug(slug);
    if (target) permanentRedirect(categoryPath(target));
    notFound();
  }

  const { category, services, otherCategories } = data;
  const headerImage = categoryImage(category.slug);
  const heading = `${category.name} ${t('inCity')}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: tNav('home'), path: '/' },
        { name: tNav('services'), path: '/servicos' },
        { name: category.name, path: categoryPath(category.slug) },
      ]),
      {
        '@type': 'ItemList',
        '@id': `${absoluteUrl(categoryPath(category.slug))}#services`,
        name: `${heading} — Chi Sublime`,
        numberOfItems: services.length,
        itemListElement: services.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: serviceJsonLd({
            name: s.name,
            description: s.description,
            categoryName: category.name,
            categorySlug: category.slug,
            slug: s.slug,
            price: s.price,
          }),
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <PublicNavbar />

      {/* Header com imagem da categoria */}
      <header className="relative flex min-h-[45svh] items-end overflow-hidden md:min-h-[55svh]">
        <div className="absolute inset-0 z-0">
          <Image
            src={headerImage}
            alt={`${heading} — Chi Sublime`}
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="from-chi-green-darker/20 via-chi-green-darker/40 to-chi-green-darker/90 absolute inset-0 z-10 bg-gradient-to-b" />

        <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pt-36 pb-12 md:px-12 md:pb-16">
          <nav
            className="mb-6 text-[11px] tracking-[0.2em] uppercase"
            style={{ color: 'rgba(250,247,242,0.7)' }}
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-chi-gold transition-colors">
              {tNav('home')}
            </Link>
            <span className="mx-2" style={{ color: '#D4AF6E' }}>
              /
            </span>
            <Link href="/servicos" className="hover:text-chi-gold transition-colors">
              {tNav('services')}
            </Link>
            <span className="mx-2" style={{ color: '#D4AF6E' }}>
              /
            </span>
            <span style={{ color: '#FAF7F2' }}>{category.name}</span>
          </nav>

          <h1
            className="text-display-lg max-w-3xl font-serif text-balance"
            style={{ color: '#FAF7F2', textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {heading}
          </h1>
          {category.description && (
            <p
              className="mt-5 max-w-xl text-base leading-[1.8] md:text-lg"
              style={{ color: 'rgba(250,247,242,0.85)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {category.description}
            </p>
          )}
        </div>
      </header>

      {/* A carta da categoria */}
      <main className="bg-chi-cream py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          {services.length === 0 ? (
            <p className="text-chi-charcoal-soft py-16 text-center font-serif text-lg italic">
              {t('emptyCategory')}
            </p>
          ) : (
            <div className="border-chi-border border-t">
              {services.map((service, i) => (
                <Reveal key={service.id} delay={Math.min(i * 0.05, 0.3)}>
                  <div className="border-chi-border grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-2 border-b py-7 md:py-8">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-chi-charcoal font-serif text-xl leading-snug md:text-2xl">
                          <Link
                            href={servicePath(category.slug, service.slug)}
                            className="hover:text-chi-gold-deep transition-colors duration-300"
                          >
                            {service.name}
                          </Link>
                        </h2>
                        {service.popular && (
                          <span className="text-chi-gold-deep border-chi-gold/40 rounded border px-2 py-0.5 text-[9px] font-semibold tracking-[0.2em] uppercase">
                            {t('popular')}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-chi-charcoal-soft mt-2 max-w-xl text-sm leading-[1.75]">
                          {service.description}
                        </p>
                      )}
                      <p className="text-chi-charcoal-light mt-2 text-xs tracking-[0.15em] uppercase">
                        {formatDuration(service.duration)}
                        <span className="mx-2" aria-hidden>
                          ·
                        </span>
                        <Link
                          href={servicePath(category.slug, service.slug)}
                          className="text-chi-gold-deep hover:text-chi-green-deep transition-colors duration-300"
                          aria-label={`${t('viewService')}: ${service.name}`}
                        >
                          {t('viewService')} →
                        </Link>
                      </p>
                    </div>

                    <span className="text-chi-green-deep shrink-0 font-mono text-lg font-medium md:text-xl">
                      {formatPrice(service.price)}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {/* CTA — abre o Step 1 já com esta categoria expandida */}
          <Reveal delay={0.1}>
            <div className="mt-14 flex flex-col items-center gap-5 text-center">
              <Link
                href={`/marcacoes?categoria=${category.slug}`}
                className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-12 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E' }}
              >
                {t('bookCta', { category: category.name.toLowerCase() })}
              </Link>
              <p className="text-chi-charcoal-light max-w-sm text-xs leading-relaxed">
                {t('bookHint')}
              </p>
            </div>
          </Reveal>
        </div>

        {/* Navegação entre categorias */}
        {otherCategories.length > 0 && (
          <div className="mx-auto mt-24 max-w-4xl px-6 md:px-12">
            <p className="eyebrow text-chi-gold-deep mb-8">{t('explore')}</p>
            <ul className="border-chi-border border-t">
              {otherCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={categoryPath(cat.slug)}
                    className="group border-chi-border flex items-center justify-between border-b py-5 transition-colors"
                  >
                    <span className="text-chi-charcoal group-hover:text-chi-gold-deep font-serif text-xl transition-colors duration-300 md:text-2xl">
                      {cat.name}
                    </span>
                    <span className="text-chi-gold-deep transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <PublicFooter />
    </>
  );
}
