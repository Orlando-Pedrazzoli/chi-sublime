// 📄 src/app/servicos/page.tsx
/**
 * Chi Sublime — Índice de serviços e preços (página pública)
 * ============================================================
 *
 * URL: /servicos
 *
 * Antes era um redirect 307 para /#services — uma âncora não é
 * uma página, por isso o site não tinha NENHUM URL que listasse
 * todos os serviços. Agora é a página-índice: todas as categorias
 * e todos os serviços, com duração, preço e link para a página
 * de cada um.
 *
 * Para o Google é o "mapa" interno do catálogo (todas as páginas
 * de serviço ficam a 1 clique daqui e a 2 da home) e a página
 * natural para pesquisas de preços ("preços cabeleireiro Cascais").
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Reveal } from '@/components/shared/Reveal';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  categoryPath,
  formatDuration,
  formatPrice,
  jsonLdScript,
  servicePath,
} from '@/lib/seo/site';

export const revalidate = 600;

const TITLE = 'Serviços e Preços — Cabeleireiro e Beleza em Cascais';
const DESCRIPTION =
  'Todos os serviços e preços do Chi Sublime, em Cascais: cabeleireiro, sobrancelhas, maquilhagem, unhas e depilação. Veja a duração de cada serviço e marque online.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/servicos' },
  openGraph: { title: `${TITLE} | Chi Sublime`, description: DESCRIPTION, url: '/servicos' },
};

async function getCatalog(locale: Locale) {
  await connectDB();

  const [categories, services] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1 }).lean(),
    Service.find({ active: true }).sort({ order: 1, 'name.pt': 1 }).lean(),
  ]);

  return categories.map((c) => ({
    slug: c.slug,
    name: localizedField(c.name, locale),
    description: localizedField(c.description, locale) || undefined,
    services: services
      .filter((s) => String(s.categoryId) === String(c._id))
      .map((s) => ({
        slug: s.slug,
        name: localizedField(s.name, locale),
        duration: s.duration,
        price: s.price,
      })),
  }));
}

export default async function ServicosIndexPage() {
  const locale = (await getLocale()) as Locale;
  const [t, tNav, catalog] = await Promise.all([
    getTranslations('services.page'),
    getTranslations('nav'),
    getCatalog(locale),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: tNav('home'), path: '/' },
        { name: tNav('services'), path: '/servicos' },
      ]),
      {
        '@type': 'ItemList',
        name: TITLE,
        itemListElement: catalog.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${c.name} ${t('inCity')}`,
          url: absoluteUrl(categoryPath(c.slug)),
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-36 pb-24 md:pt-44">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          <Reveal>
            <p className="eyebrow text-chi-gold-deep mb-6">{t('indexEyebrow')}</p>
            <h1 className="text-display-md text-chi-charcoal max-w-3xl font-serif text-balance">
              {t('indexTitle')}
            </h1>
            <p className="text-chi-charcoal-soft mt-6 max-w-2xl text-base leading-[1.85] md:text-lg">
              {t('indexIntro')}
            </p>
          </Reveal>

          {/* Atalhos para as categorias */}
          <nav aria-label={tNav('services')} className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {catalog.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="text-chi-gold-deep hover:text-chi-green-deep text-xs tracking-[0.2em] uppercase transition-colors duration-300"
              >
                {c.name}
              </a>
            ))}
          </nav>

          <div className="mt-16 space-y-20">
            {catalog.map((c) => (
              <section key={c.slug} id={c.slug} className="scroll-mt-32">
                <Reveal>
                  <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                    <h2 className="text-chi-green-deep font-serif text-3xl md:text-4xl">
                      <Link
                        href={categoryPath(c.slug)}
                        className="hover:text-chi-gold-deep transition-colors duration-300"
                      >
                        {c.name} {t('inCity')}
                      </Link>
                    </h2>
                    <Link
                      href={categoryPath(c.slug)}
                      className="text-chi-gold-deep hover:text-chi-green-deep text-xs tracking-[0.2em] uppercase transition-colors duration-300"
                    >
                      {t('viewCategory', { category: c.name })} →
                    </Link>
                  </div>
                  {c.description && (
                    <p className="text-chi-charcoal-soft mb-6 max-w-2xl text-sm leading-[1.8]">
                      {c.description}
                    </p>
                  )}

                  {c.services.length === 0 ? (
                    <p className="text-chi-charcoal-soft font-serif italic">{t('emptyCategory')}</p>
                  ) : (
                    <ul className="border-chi-border border-t">
                      {c.services.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={servicePath(c.slug, s.slug)}
                            className="group border-chi-border flex items-baseline justify-between gap-6 border-b py-4"
                          >
                            <span className="min-w-0">
                              <span className="text-chi-charcoal group-hover:text-chi-gold-deep block text-base transition-colors duration-300 md:text-lg">
                                {s.name}
                              </span>
                              <span className="text-chi-charcoal-light mt-0.5 block text-xs tracking-[0.12em] uppercase">
                                {formatDuration(s.duration)}
                              </span>
                            </span>
                            <span className="text-chi-green-deep shrink-0 font-mono text-base font-medium">
                              {formatPrice(s.price)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              </section>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-20 flex flex-col items-center gap-5 text-center">
              <Link
                href="/marcacoes"
                className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-12 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E', borderRadius: '8px' }}
              >
                {tNav('book')}
              </Link>
              <p className="text-chi-charcoal-light max-w-sm text-xs leading-relaxed">
                {t('bookHint')}
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
