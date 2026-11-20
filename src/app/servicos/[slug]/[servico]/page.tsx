// 📄 src/app/servicos/[slug]/[servico]/page.tsx
/**
 * Chi Sublime — Página de um serviço (pública)
 * ============================================================
 *
 * URL: /servicos/{categoria}/{serviço}
 *      ex.: /servicos/cabeleireiro/corte-feminino
 *
 * PORQUÊ: antes, cada serviço era só uma linha dentro da página
 * da categoria. Sem URL, title e H1 próprios, uma pesquisa como
 * "brow lamination Cascais" ou "madeixas Cascais" não tinha
 * nenhuma página do site para a qual o Google pudesse mandar.
 *
 * Conteúdo (tudo vindo da BD — nada inventado):
 * - nome, categoria, duração, preço
 * - descrição do serviço (admin → Serviços). Se estiver vazia,
 *   usa-se um texto factual gerado a partir dos dados.
 *   👉 As páginas com descrição própria ranqueiam MUITO melhor:
 *      vale a pena o salão escrever 2–3 frases nos serviços
 *      mais procurados.
 * - profissionais que o prestam (links para /equipa/{slug})
 * - outros serviços da mesma categoria (links internos)
 *
 * JSON-LD: Service + Offer (provider → #salon) + BreadcrumbList.
 *
 * URL canónico único: se o serviço for pedido debaixo da
 * categoria errada (ou de um slug antigo de categoria), faz 301
 * para o caminho certo.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { connectDB } from '@/lib/db/connect';
import { Category, Service, Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Reveal } from '@/components/shared/Reveal';
import { categoryImage } from '@/lib/content/category-images';
import {
  SALON,
  breadcrumbJsonLd,
  categoryPath,
  formatDuration,
  formatPrice,
  jsonLdScript,
  serviceJsonLd,
  servicePath,
  staffPath,
} from '@/lib/seo/site';

export const revalidate = 600;

// ============================================================
// DATA
// ============================================================

async function getServiceData(serviceSlug: string, locale: Locale) {
  await connectDB();

  // O slug do serviço é único em toda a coleção
  const service = await Service.findOne({ slug: serviceSlug, active: true }).lean();
  if (!service) return null;

  const category = await Category.findOne({ _id: service.categoryId, active: true }).lean();
  if (!category) return null;

  // staffIds vazio/ausente = qualquer profissional presta o serviço
  const staffIds = service.staffIds ?? [];
  const [staff, siblings] = await Promise.all([
    Staff.find({
      active: true,
      showOnWebsite: { $ne: false },
      ...(staffIds.length > 0 ? { _id: { $in: staffIds } } : {}),
    })
      .sort({ order: 1 })
      .select('name slug role')
      .lean(),
    Service.find({ categoryId: category._id, active: true, _id: { $ne: service._id } })
      .sort({ order: 1, 'name.pt': 1 })
      .select('name slug duration price')
      .lean(),
  ]);

  return {
    category: { slug: category.slug, name: localizedField(category.name, locale) },
    service: {
      slug: service.slug,
      name: localizedField(service.name, locale),
      description: localizedField(service.description, locale) || undefined,
      duration: service.duration,
      price: service.price,
      popular: service.popular,
    },
    staff: staff.map((s) => ({
      slug: s.slug,
      name: s.name,
      role: localizedField(s.role, locale),
    })),
    siblings: siblings.map((s) => ({
      slug: s.slug,
      name: localizedField(s.name, locale),
      duration: s.duration,
      price: s.price,
    })),
  };
}

type ServiceData = NonNullable<Awaited<ReturnType<typeof getServiceData>>>;

/**
 * "Corte Feminino — Cabeleireiro em Cascais"
 * "Design de Sobrancelhas em Cascais" (o nome já contém a categoria)
 */
function buildHeadline(data: ServiceData, inCity: string): string {
  const { service, category } = data;
  const repeatsCategory = service.name.toLowerCase().includes(category.name.toLowerCase());
  return repeatsCategory
    ? `${service.name} ${inCity}`
    : `${service.name} — ${category.name} ${inCity}`;
}

// ============================================================
// METADATA
// ============================================================

type Params = Promise<{ slug: string; servico: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { servico } = await params;
  const locale = (await getLocale()) as Locale;
  const [t, data] = await Promise.all([
    getTranslations('services.page'),
    getServiceData(servico, locale),
  ]);
  if (!data) return { title: 'Serviços', robots: { index: false, follow: true } };

  const { service, category } = data;
  const title = buildHeadline(data, t('inCity'));
  const facts = t('autoDescription', {
    service: service.name,
    category: category.name.toLowerCase(),
    duration: formatDuration(service.duration),
    price: formatPrice(service.price),
  });
  const description = service.description ?? facts;

  const canonical = servicePath(category.slug, service.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Chi Sublime`,
      description,
      url: canonical,
      images: [{ url: categoryImage(category.slug), alt: `${service.name} — Chi Sublime` }],
    },
  };
}

// ============================================================
// PAGE
// ============================================================

export default async function ServicoPage({ params }: { params: Params }) {
  const { slug, servico } = await params;
  const locale = (await getLocale()) as Locale;
  const [t, tNav, data] = await Promise.all([
    getTranslations('services.page'),
    getTranslations('nav'),
    getServiceData(servico, locale),
  ]);
  if (!data) notFound();

  const { service, category, staff, siblings } = data;

  // Um só URL por serviço: categoria errada ou slug antigo → 301
  if (slug !== category.slug) permanentRedirect(servicePath(category.slug, service.slug));

  const path = servicePath(category.slug, service.slug);
  const bookHref = `/marcacoes?categoria=${category.slug}`;
  const description =
    service.description ??
    t('autoDescription', {
      service: service.name,
      category: category.name.toLowerCase(),
      duration: formatDuration(service.duration),
      price: formatPrice(service.price),
    });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: tNav('home'), path: '/' },
        { name: tNav('services'), path: '/servicos' },
        { name: category.name, path: categoryPath(category.slug) },
        { name: service.name, path },
      ]),
      serviceJsonLd({
        name: service.name,
        description,
        categoryName: category.name,
        categorySlug: category.slug,
        slug: service.slug,
        price: service.price,
      }),
    ],
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: t('duration'), value: formatDuration(service.duration) },
    { label: t('price'), value: formatPrice(service.price) },
    {
      label: t('where'),
      value: (
        <>
          {SALON.street}, {SALON.neighbourhood}
          <br />
          {SALON.postalCode} {SALON.city}
          <br />
          <span className="text-chi-charcoal-light text-sm">{t('hoursLine')}</span>
        </>
      ),
    },
    {
      label: t('with'),
      value:
        staff.length === 0 ? (
          t('anyStaff')
        ) : (
          <>
            {staff.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && ', '}
                <Link
                  href={staffPath(s.slug)}
                  className="hover:text-chi-gold-deep underline decoration-[#D4AF6E]/50 underline-offset-4 transition-colors duration-300"
                >
                  {s.name}
                </Link>
              </span>
            ))}
          </>
        ),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <PublicNavbar />

      {/* Header com a imagem da categoria */}
      <header className="relative flex min-h-[40svh] items-end overflow-hidden md:min-h-[48svh]">
        <div className="absolute inset-0 z-0">
          <Image
            src={categoryImage(category.slug)}
            alt={`${service.name} — ${category.name} ${t('inCity')}, Chi Sublime`}
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
            className="mb-6 text-[11px] leading-[2] tracking-[0.2em] uppercase"
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
            <Link
              href={categoryPath(category.slug)}
              className="hover:text-chi-gold transition-colors"
            >
              {category.name}
            </Link>
            <span className="mx-2" style={{ color: '#D4AF6E' }}>
              /
            </span>
            <span style={{ color: '#FAF7F2' }}>{service.name}</span>
          </nav>

          <h1
            className="text-display-lg max-w-3xl font-serif text-balance"
            style={{ color: '#FAF7F2', textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
          >
            {service.name}
          </h1>
          <p
            className="mt-5 text-xs font-semibold tracking-[0.28em] uppercase"
            style={{ color: '#D4AF6E', textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
          >
            {category.name} {t('inCity')} · Chi Sublime
          </p>
        </div>
      </header>

      <main className="bg-chi-cream py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          {/* Sobre o serviço */}
          <Reveal>
            <h2 className="eyebrow text-chi-gold-deep mb-6">{t('about')}</h2>
            <p className="text-chi-charcoal max-w-2xl font-serif text-xl leading-[1.6] text-balance md:text-2xl">
              {description}
            </p>
          </Reveal>

          {/* Factos: duração, preço, onde, com quem */}
          <Reveal delay={0.1}>
            <dl className="border-chi-border mt-14 border-t">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="border-chi-border grid grid-cols-[110px_1fr] items-baseline gap-6 border-b py-5 md:grid-cols-[180px_1fr]"
                >
                  <dt className="text-chi-charcoal-light text-xs tracking-[0.18em] uppercase">
                    {fact.label}
                  </dt>
                  <dd className="text-chi-charcoal m-0 text-base leading-[1.7] md:text-lg">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* CTA */}
          <Reveal delay={0.15}>
            <div className="mt-14 flex flex-col items-center gap-5 text-center">
              <Link
                href={bookHref}
                className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-12 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E', borderRadius: '8px' }}
              >
                {t('bookService')}
              </Link>
              <p className="text-chi-charcoal-light max-w-sm text-xs leading-relaxed">
                {t('bookHint')}
              </p>
            </div>
          </Reveal>
        </div>

        {/* Outros serviços da mesma categoria — links internos */}
        {siblings.length > 0 && (
          <div className="mx-auto mt-24 max-w-4xl px-6 md:px-12">
            <h2 className="eyebrow text-chi-gold-deep mb-8">
              {t('moreIn', { category: category.name })}
            </h2>
            <ul className="border-chi-border border-t">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={servicePath(category.slug, s.slug)}
                    className="group border-chi-border flex items-baseline justify-between gap-6 border-b py-4"
                  >
                    <span className="min-w-0">
                      <span className="text-chi-charcoal group-hover:text-chi-gold-deep block font-serif text-lg transition-colors duration-300 md:text-xl">
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

            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-xs tracking-[0.2em] uppercase">
              <Link
                href={categoryPath(category.slug)}
                className="text-chi-gold-deep hover:text-chi-green-deep transition-colors duration-300"
              >
                ← {category.name} {t('inCity')}
              </Link>
              <Link
                href="/servicos"
                className="text-chi-gold-deep hover:text-chi-green-deep transition-colors duration-300"
              >
                {t('allServices')} →
              </Link>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </>
  );
}
