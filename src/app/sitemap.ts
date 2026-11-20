// 📄 src/app/sitemap.ts
/**
 * Chi Sublime — sitemap.xml dinâmico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/sitemap.xml
 *
 * REGRA: só entra aqui um URL que responda 200 e seja indexável.
 *
 * - /servicos/{categoria}            ← coleção Category
 * - /servicos/{categoria}/{serviço}  ← coleção Service (com a
 *   categoria populada — o slug do serviço sozinho NÃO é um URL)
 * - /equipa/{slug}                   ← coleção Staff
 *
 * (A versão anterior publicava /servicos/{slug-do-serviço}, que a
 * rota resolvia como categoria → 35 URLs a dar 404 e as 5
 * categorias reais fora do sitemap.)
 *
 * `lastModified` vem sempre de `updatedAt` real. Nunca `new Date()`:
 * isso diz ao Google que a página muda a cada leitura e ele deixa
 * de confiar no campo.
 *
 * ISR de 1 hora. Fail-safe: se a BD falhar, devolve o núcleo
 * estático em vez de servir um 500 aos bots.
 */

import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db/connect';
import { Category, Service, Staff } from '@/lib/models';
import { absoluteUrl, categoryPath, servicePath, staffPath } from '@/lib/seo/site';

/** Revalida o sitemap a cada hora (ISR) */
export const revalidate = 3600;

const LEGAL_ROUTES: MetadataRoute.Sitemap = [
  '/privacidade',
  '/termos',
  '/cookies',
  '/rgpd',
  '/cancelamento',
].map((path) => ({ url: absoluteUrl(path), changeFrequency: 'yearly', priority: 0.2 }));

function staticRoutes(lastModified?: Date): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: absoluteUrl('/servicos'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/marcacoes'), changeFrequency: 'monthly', priority: 0.8 },
    ...LEGAL_ROUTES,
  ];
}

const latest = (dates: (Date | undefined)[]): Date | undefined => {
  const times = dates.filter((d): d is Date => Boolean(d)).map((d) => new Date(d).getTime());
  return times.length ? new Date(Math.max(...times)) : undefined;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const conn = await connectDB();
    // connectDB devolve null se MONGODB_URI não estiver definido
    if (!conn) return staticRoutes();

    const [categories, services, staff] = await Promise.all([
      Category.find({ active: true }).sort({ order: 1 }).select('slug updatedAt').lean(),
      Service.find({ active: true }).sort({ order: 1 }).select('slug categoryId updatedAt').lean(),
      Staff.find({ active: true, showOnWebsite: { $ne: false } })
        .sort({ order: 1 })
        .select('slug updatedAt')
        .lean(),
    ]);

    const categoryById = new Map(categories.map((c) => [String(c._id), c]));

    const categoryEntries: MetadataRoute.Sitemap = categories
      .filter((c) => Boolean(c.slug))
      .map((c) => {
        // A carta da categoria muda quando qualquer serviço dela muda
        const own = services.filter((s) => String(s.categoryId) === String(c._id));
        return {
          url: absoluteUrl(categoryPath(c.slug)),
          lastModified: latest([c.updatedAt, ...own.map((s) => s.updatedAt)]),
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        };
      });

    const serviceEntries: MetadataRoute.Sitemap = services.flatMap((s) => {
      // Serviço sem categoria ativa não tem página → fica de fora
      const category = categoryById.get(String(s.categoryId));
      if (!s.slug || !category?.slug) return [];
      return [
        {
          url: absoluteUrl(servicePath(category.slug, s.slug)),
          lastModified: s.updatedAt,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        },
      ];
    });

    const staffEntries: MetadataRoute.Sitemap = staff
      .filter((s) => Boolean(s.slug))
      .map((s) => ({
        url: absoluteUrl(staffPath(s.slug)),
        lastModified: s.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));

    const catalogUpdatedAt = latest([
      ...categories.map((c) => c.updatedAt),
      ...services.map((s) => s.updatedAt),
    ]);

    return [
      ...staticRoutes(catalogUpdatedAt),
      ...categoryEntries,
      ...serviceEntries,
      ...staffEntries,
    ];
  } catch (error) {
    // Fail-safe: nunca servir 500 a um bot — devolve o núcleo estático
    console.error('[sitemap] Falha ao gerar entradas dinâmicas:', error);
    return staticRoutes();
  }
}
