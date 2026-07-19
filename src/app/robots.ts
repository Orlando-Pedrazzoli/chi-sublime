/**
 * Chi Sublime — robots.txt dinâmico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/robots.txt
 *
 * Estratégia:
 * - Regras explícitas para Googlebot e Bingbot (os dois motores
 *   relevantes para o mercado PT) + regra genérica para os restantes.
 * - Bloqueia tudo o que é privado, transacional ou stateful:
 *   admin, API, área de cliente, autenticação e passos do funil
 *   de reserva (dependem de sessão — crawl geraria soft-404s).
 * - /reservar (passo 1) fica INDEXÁVEL — é landing page valiosa
 *   para "marcar cabeleireiro Cascais". Apenas os sub-passos
 *   (/reservar/horario, /reservar/confirmar, /reservar/[nº])
 *   são bloqueados via "Disallow: /reservar/" (trailing slash
 *   bloqueia sub-rotas mas não a rota exata).
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

/** Rotas que nenhum bot deve rastrear */
const DISALLOWED_PATHS = [
  '/admin/',
  '/admin',
  '/api/',
  '/conta/',
  '/conta',
  '/entrar',
  '/registar',
  '/recuperar-password',
  '/redefinir-password',
  '/reservar/', // bloqueia sub-passos do funil; /reservar (exato) continua permitido
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/_next/image'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: DISALLOWED_PATHS,
        // Bing respeita crawl-delay — 1s evita picos nas serverless functions
        crawlDelay: 1,
      },
      {
        // Todos os restantes bots (DuckDuckBot, Applebot, etc.)
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
