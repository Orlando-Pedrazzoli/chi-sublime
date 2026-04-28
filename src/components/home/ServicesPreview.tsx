import Image from 'next/image';
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';

const CATEGORY_IMAGES: Record<string, string> = {
  cabelereiro: '/images/services/detalhe6.jpg',
  sobrancelhas: '/images/services/sobrancelhas.jpg',
  maquilhagem: '/images/services/maquilhagem.jpg',
  unhas: '/images/services/unhas.jpg',
  depilacao: '/images/services/depilacao.jpg',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  cabelereiro: 'Cortes, coloração, madeixas, alisamentos, tratamentos vegan, extensões fio a fio.',
  sobrancelhas:
    'Design personalizado, brow lamination, pigmentação e limpeza — o olhar começa aqui.',
  maquilhagem:
    'Maquilhagem premium e maquilhagem de noiva — para os momentos em que cada detalhe importa.',
  unhas: 'Manicure simples, manicure gelinho, pedicure simples, pedicure gelinho.',
  depilacao: 'Tratamentos completos de depilação para todo o corpo, com produtos suaves.',
};

type CategoryCard = {
  slug: string;
  title: string;
  count: number;
  description: string;
  image: string;
};

async function getCategoriesWithCount(): Promise<CategoryCard[]> {
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
        title: cat.name.pt,
        count,
        description: CATEGORY_DESCRIPTIONS[cat.slug] ?? 'Serviços de excelência.',
        image: CATEGORY_IMAGES[cat.slug] ?? '/images/services/cabelereiro.jpg',
      } satisfies CategoryCard;
    }),
  );

  return cards;
}

export async function ServicesPreview() {
  const services = await getCategoriesWithCount();

  return (
    <section id="services" className="bg-chi-green-deep text-chi-cream py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-chi-gold mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
              — Os nossos serviços —
            </span>
            <h2 className="font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
              Cinco universos
              <br />
              de <span className="text-chi-gold italic">cuidado</span>.
            </h2>
          </div>
          <p className="text-chi-cream/70 max-w-md text-base leading-[1.85]">
            Desde tratamentos capilares de excelência a maquilhagem de noiva e design de
            sobrancelhas — cada serviço é executado com a precisão de quem trata cada cliente como
            única.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/servicos/${service.slug}`}
              className="group border-chi-gold/20 bg-chi-cream/[0.04] hover:border-chi-gold relative overflow-hidden border transition-all duration-500 hover:-translate-y-1"
            >
              <span className="bg-chi-gold absolute top-0 left-0 z-20 h-px w-0 transition-all duration-700 group-hover:w-full" />

              <div className="relative h-60 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  quality={85}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-all duration-700 group-hover:scale-110"
                  style={{ filter: 'brightness(0.85) saturate(0.9)' }}
                />
                <div className="to-chi-green-deep/60 absolute inset-0 bg-gradient-to-b from-transparent via-transparent" />
              </div>

              <div className="p-8">
                <h3 className="text-chi-cream mb-1 font-serif text-2xl font-normal md:text-3xl">
                  {service.title}
                </h3>
                <span className="text-chi-gold mb-5 block text-[10px] tracking-[0.25em] uppercase">
                  {service.count} {service.count === 1 ? 'serviço' : 'serviços'}
                </span>
                <p className="text-chi-cream/65 mb-6 text-sm leading-[1.7]">
                  {service.description}
                </p>
                <span className="text-chi-gold inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase transition-all duration-300 group-hover:gap-3">
                  Ver serviços
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
