// 📄 src/app/page.tsx
import type { Metadata } from 'next';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Hero } from '@/components/home/Hero';
import { Philosophy } from '@/components/home/Philosophy';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { TeamPreview } from '@/components/home/TeamPreview';
import { GalleryPreview } from '@/components/home/GalleryPreview';
import { ContactPreview } from '@/components/home/ContactPreview';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { connectDB } from '@/lib/db/connect';
import { Category, Service } from '@/lib/models';
import { SALON_ID, absoluteUrl, categoryPath, jsonLdScript, serviceJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Catálogo de serviços do salão em JSON-LD (hasOfferCatalog).
 *
 * Acrescenta ao nó HairSalon (#salon, emitido no layout raiz) as 5
 * categorias e os serviços de cada uma, com preço e URL. Usa o
 * mesmo @id, por isso o Google junta os dois blocos numa só
 * entidade. Fica só na home — não faz sentido repetir o catálogo
 * inteiro em todas as páginas (incluindo o admin).
 *
 * Fail-safe: se a BD falhar, a home renderiza sem este bloco.
 */
async function getCatalogJsonLd() {
  try {
    const conn = await connectDB();
    if (!conn) return null;

    const [categories, services] = await Promise.all([
      Category.find({ active: true }).sort({ order: 1 }).lean(),
      Service.find({ active: true }).sort({ order: 1, 'name.pt': 1 }).lean(),
    ]);
    if (categories.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      '@id': SALON_ID,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Serviços Chi Sublime',
        itemListElement: categories.map((c) => ({
          '@type': 'OfferCatalog',
          name: c.name.pt,
          url: absoluteUrl(categoryPath(c.slug)),
          itemListElement: services
            .filter((s) => String(s.categoryId) === String(c._id))
            .map((s) => {
              const service = serviceJsonLd({
                name: s.name.pt,
                description: s.description?.pt || undefined,
                categoryName: c.name.pt,
                categorySlug: c.slug,
                slug: s.slug,
                price: s.price,
              });
              // No catálogo o nó é o Offer; o Service vai em itemOffered
              const { offers, ...itemOffered } = service;
              return { ...offers, itemOffered };
            }),
        })),
      },
    };
  } catch (error) {
    console.error('[home] Falha ao gerar o catálogo JSON-LD:', error);
    return null;
  }
}

export default async function HomePage() {
  const catalogJsonLd = await getCatalogJsonLd();

  return (
    <>
      {catalogJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(catalogJsonLd)} />
      )}
      <PublicNavbar />
      <Hero />
      <Philosophy />
      <ServicesPreview />
      <TeamPreview />
      <GalleryPreview />
      <ContactPreview />
      <PublicFooter />
    </>
  );
}
