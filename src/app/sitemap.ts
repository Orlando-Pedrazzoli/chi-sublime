/**
 * Chi Sublime — sitemap.xml dinâmico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/sitemap.xml
 *
 * Estratégia:
 * - Rotas estáticas com prioridades calibradas para SEO local
 *   (home e serviços no topo; legais no fundo).
 * - Rotas dinâmicas (/servicos/[slug] e /equipa/[slug]) lidas
 *   diretamente do MongoDB — apenas documentos `active: true`,
 *   com `lastModified` real vindo de `updatedAt` (timestamps
 *   do Mongoose). Google/Bing usam este campo para priorizar
 *   re-crawl de páginas alteradas.
 * - ISR de 1 hora (`revalidate = 3600`): o sitemap reflete
 *   novos serviços/staff sem redeploy, sem custo por request.
 * - Fail-safe: se a DB falhar (build sem env, cold start com
 *   timeout), devolve as rotas estáticas em vez de rebentar
 *   o build ou servir um 500 aos bots.
 */

import type { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db/connect';
import { Service, Staff } from '@/lib/models';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

/** Revalida o sitemap a cada hora (ISR) */
export const revalidate = 3600;

/* ============================================================
   Rotas estáticas — prioridade e frequência calibradas
   ============================================================ */

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/reservar`,
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
   Rotas dinâmicas — MongoDB
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
  const staff = await Staff.find({ active: true }).select('slug updatedAt').lean<SlugDoc[]>();

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

    // connectDB devolve null se MONGODB_URI não estiver definido
    if (!conn) return STATIC_ROUTES;

    const [serviceEntries, staffEntries] = await Promise.all([
      getServiceEntries(),
      getStaffEntries(),
    ]);

    return [...STATIC_ROUTES, ...serviceEntries, ...staffEntries];
  } catch (error) {
    // Fail-safe: nunca servir 500 a um bot — devolve o núcleo estático
    console.error('[sitemap] Falha ao gerar entradas dinâmicas:', error);
    return STATIC_ROUTES;
  }
}
