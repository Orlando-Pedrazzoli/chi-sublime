// 📄 src/app/reservar/page.tsx
/**
 * Chi Sublime — Reservar (Step 1: Escolher Servico)
 * ============================================================
 *
 * Server Component. Busca categorias e servicos da DB e
 * passa para o ServicePicker (Client Component).
 *
 * Mobile-first: header compacto (uma linha) para que a lista
 * de serviços apareça above the fold — o caminho até ao
 * primeiro toque útil é o mais curto possível.
 */

import type { Metadata } from 'next';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { ServicePicker, type CategoryWithServices } from '@/components/booking/ServicePicker';

export const metadata: Metadata = {
  title: 'Reservar Online | Chi Sublime',
  description:
    'Reserve o seu serviço no Chi Sublime — Hair Style & Beauty. Cabelereiro, sobrancelhas, maquilhagem, unhas e depilação em Cascais.',
  alternates: { canonical: '/reservar' },
};

// ============================================================
// DATA FETCHING (server-side)
// ============================================================

async function getCategoriesWithServices(): Promise<CategoryWithServices[]> {
  await connectDB();

  const categories = await Category.find({ active: true }).sort({ order: 1 }).lean();

  const result = await Promise.all(
    categories.map(async (cat) => {
      const services = await Service.find({
        categoryId: cat._id,
        active: true,
      })
        .sort({ order: 1, 'name.pt': 1 })
        .lean();

      return {
        id: String(cat._id),
        slug: cat.slug,
        name: cat.name.pt,
        services: services.map((s) => ({
          id: String(s._id),
          name: s.name.pt,
          duration: s.duration,
          bufferAfter: s.bufferAfter ?? 5,
          price: s.price,
          popular: s.popular ?? false,
        })),
      };
    }),
  );

  return result;
}

// ============================================================
// PAGE
// ============================================================

type SearchParams = Promise<{ categoria?: string }>;

export default async function ReservarPage({ searchParams }: { searchParams: SearchParams }) {
  const { categoria } = await searchParams;
  const categories = await getCategoriesWithServices();

  return (
    <>
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-24 pb-36 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12">
          {/* Header compacto — título e ajuda numa linha só */}
          <header className="mb-6 md:mb-10">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-chi-charcoal font-serif text-2xl md:text-4xl">
                Escolha os serviços
              </h1>
              <span className="text-chi-charcoal-light hidden shrink-0 text-xs tracking-[0.15em] uppercase sm:block">
                Passo 1 de 3
              </span>
            </div>
            <p className="text-chi-charcoal-soft mt-2 hidden max-w-xl text-sm leading-[1.7] md:block">
              Pode combinar até 5 serviços numa única reserva. O total e a duração aparecem no
              resumo à medida que escolhe.
            </p>
          </header>

          {/* Stepper */}
          <div className="mb-8 md:mb-12">
            <BookingStepper currentStep="service" />
          </div>

          {/* Layout: lista de servicos + sidebar (desktop) */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
            {/* Coluna principal — categorias e servicos */}
            <div>
              <ServicePicker categories={categories} initialOpenSlug={categoria} />
            </div>

            {/* Coluna lateral — resumo (sticky em desktop; no mobile o
                BookingSummary rende a barra fixa inferior) */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <BookingSummary
                ctaLabel="Continuar"
                ctaHref="/reservar/horario"
                ctaHelper="Próximo passo: escolher data e horário"
              />
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
