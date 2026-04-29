import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

const CATEGORY_IMAGES: Record<string, string> = {
  cabelereiro: '/images/services/detalhe9.jpg',
  sobrancelhas: '/images/services/sobrancelhas.jpg',
  maquilhagem: '/images/services/maquilhagem.jpg',
  unhas: '/images/services/unhas.jpg',
  depilacao: '/images/services/depilacao.jpg',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  cabelereiro:
    'A arte do cabelo elevada à excelência. Cortes, coloração, madeixas e tratamentos premium num espaço sensorial em Cascais.',
  sobrancelhas:
    'O olhar começa nas sobrancelhas. Design personalizado, brow lamination e pigmentação para um resultado natural e duradouro.',
  maquilhagem:
    'Maquilhagem que revela quem você é. Para o dia a dia ou para o seu grande dia, cada gesto é pensado ao detalhe.',
  unhas:
    'Cuidado meticuloso para mãos e pés. Manicure simples ou gelinho, cores neutras ou um toque de cor — o que combinar consigo.',
  depilacao:
    'Tratamentos completos com produtos suaves para uma pele cuidada todo o ano. Eficácia com conforto.',
};

/**
 * Helpers de formatação
 */
function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

/**
 * Server-side data fetching
 */
async function getCategoryWithServices(slug: string) {
  await connectDB();

  const category = await Category.findOne({ slug, active: true }).lean();
  if (!category) return null;

  const services = await Service.find({
    categoryId: category._id,
    active: true,
  })
    .sort({ order: 1, 'name.pt': 1 })
    .lean();

  return { category, services };
}

/**
 * Pré-gera todas as páginas em build time (mais rápidas)
 */
export async function generateStaticParams() {
  await connectDB();
  const categories = await Category.find({ active: true }).select('slug').lean();
  return categories.map((c) => ({ slug: c.slug }));
}

/**
 * SEO dinâmico por categoria
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryWithServices(slug);

  if (!data) return { title: 'Serviço não encontrado' };

  return {
    title: `${data.category.name.pt} | Chi Sublime`,
    description:
      CATEGORY_DESCRIPTIONS[slug] ??
      `Serviços de ${data.category.name.pt} no Chi Sublime, Cascais.`,
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCategoryWithServices(slug);

  if (!data) {
    notFound();
  }

  const { category, services } = data;
  const heroImage = CATEGORY_IMAGES[slug] ?? '/images/services/cabelereiro.jpg';
  const description = CATEGORY_DESCRIPTIONS[slug] ?? `Serviços de ${category.name.pt}.`;

  return (
    <>
      <PublicNavbar />

      {/* HERO da categoria */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src={heroImage}
            alt={category.name.pt}
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="from-chi-green-darker/65 via-chi-green-darker/55 to-chi-green-darker/85 absolute inset-0 z-10 bg-gradient-to-b" />

        <div className="text-chi-cream relative z-20 mx-auto max-w-3xl px-6 pt-24 text-center">
          <p
            className="text-chi-gold mb-4 font-serif text-xs tracking-[0.3em] uppercase italic md:text-sm"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            — Os nossos serviços —
          </p>
          <h1
            className="mb-6 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-6xl lg:text-7xl"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
          >
            {category.name.pt}
          </h1>
          <p
            className="text-chi-cream/95 mx-auto max-w-xl text-base leading-relaxed md:text-lg"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            {description}
          </p>
        </div>
      </section>

      {/* LISTA DE SERVIÇOS */}
      <section className="bg-chi-cream py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          <div className="mb-12 text-center">
            <span className="text-chi-gold-deep mb-3 block font-serif text-xs tracking-[0.32em] uppercase italic">
              — Catálogo —
            </span>
            <h2 className="text-chi-charcoal font-serif text-3xl leading-[1.1] font-light tracking-tight md:text-4xl">
              {services.length}{' '}
              {services.length === 1 ? 'serviço disponível' : 'serviços disponíveis'}
            </h2>
          </div>

          {services.length === 0 ? (
            <p className="text-chi-charcoal-soft text-center">
              Sem serviços disponíveis nesta categoria de momento.
            </p>
          ) : (
            <ul className="divide-chi-border divide-y">
              {services.map((service) => (
                <li
                  key={String(service._id)}
                  className="group hover:bg-chi-sand/40 -mx-4 flex items-center justify-between gap-4 rounded px-4 py-5 transition-colors md:py-6"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-chi-charcoal mb-1 font-serif text-xl font-normal md:text-2xl">
                      {service.name.pt}
                    </h3>
                    <div className="text-chi-charcoal-light flex items-center gap-3 text-xs tracking-[0.15em] uppercase">
                      <span>{formatDuration(service.duration)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-chi-green-deep font-mono text-lg font-medium tracking-tight md:text-xl">
                      {formatPrice(service.price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* CTA */}
          <div className="mt-16 text-center">
            <p className="text-chi-charcoal-soft mb-6 font-serif text-lg italic">
              Pronta para a sua visita?
            </p>
            <Link
              href={`/reservar?categoria=${slug}`}
              className="bg-chi-green-deep hover:bg-chi-green-soft hover:shadow-medium inline-block px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
              style={{ color: '#FAF7F2' }}
            >
              Agendar Agora
            </Link>
          </div>
        </div>
      </section>

      {/* Voltar a serviços */}
      <section className="bg-chi-cream pb-16 text-center">
        <Link
          href="/#services"
          className="text-chi-gold-deep hover:text-chi-green-deep inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase transition-all hover:gap-3"
        >
          <span>←</span>
          Ver todos os serviços
        </Link>
      </section>

      <PublicFooter />
    </>
  );
}
