// ðŸ“„ src/app/sitemap.ts
/**
 * Chi Sublime â€” sitemap.xml dinÃ¢mico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/sitemap.xml
 *
 * EstratÃ©gia:
 * - Rotas estÃ¡ticas com prioridades calibradas para SEO local
 *   (home e serviÃ§os no topo; legais no fundo).
 * - Rotas dinÃ¢micas (/servicos/[slug] e /equipa/[slug]) lidas
 *   diretamente do MongoDB â€” apenas documentos `active: true`,
 *   com `lastModified` real vindo de `updatedAt` (timestamps
 *   do Mongoose). Google/Bing usam este campo para priorizar
 *   re-crawl de pÃ¡ginas alteradas.
 * - ISR de 1 hora (`revalidate = 3600`): o sitemap reflete
 *   novos serviÃ§os/staff sem redeploy, sem custo por request.
 * - Fail-safe: se a DB falhar (build sem env, cold start com
 *   timeout), devolve as rotas estÃ¡ticas em vez de rebentar
 *   o build ou servir um 500 aos bots.
 */

import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db/connect';
import { Service, Staff } from '@/lib/models';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

/** Revalida o sitemap a cada hora (ISR) */
export const revalidate = 3600;

/* ============================================================
   Rotas estÃ¡ticas â€” prioridade e frequÃªncia calibradas
   ============================================================ */

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/marcacoes`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/privacidade`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/termos`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/cookies`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/rgpd`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${BASE_URL}/cancelamento`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

/* ============================================================
   Rotas dinÃ¢micas â€” MongoDB
   ============================================================ */

type SlugDoc = { slug: string; updatedAt: Date };

async function getServiceEntries(): Promise<MetadataRoute.Sitemap> {
  const services = await Service.find({ active: true }).select('slug updatedAt').lean<SlugDoc[]>();

  return services
    .filter((s) => Boolean(s.slug))
    .map((s) => ({
      url: `${BASE_URL}/servicos/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));
}

async function getStaffEntries(): Promise<MetadataRoute.Sitemap> {
  const staff = await Staff.find({ active: true, showOnWebsite: { $ne: false } })
    .select('slug updatedAt')
    .lean<SlugDoc[]>();

  return staff
    .filter((s) => Boolean(s.slug))
    .map((s) => ({
      url: `${BASE_URL}/equipa/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
}

/* ============================================================
   Sitemap
   ============================================================ */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const conn = await connectDB();

    // connectDB devolve null se MONGODB_URI nÃ£o estiver definido
    if (!conn) return STATIC_ROUTES;

    const [serviceEntries, staffEntries] = await Promise.all([
      getServiceEntries(),
      getStaffEntries(),
    ]);

    return [...STATIC_ROUTES, ...serviceEntries, ...staffEntries];
  } catch (error) {
    // Fail-safe: nunca servir 500 a um bot â€” devolve o nÃºcleo estÃ¡tico
    console.error('[sitemap] Falha ao gerar entradas dinÃ¢micas:', error);
    return STATIC_ROUTES;
  }
}
