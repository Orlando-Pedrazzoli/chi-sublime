/**
 * Chi Sublime â€” robots.txt dinÃ¢mico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/robots.txt
 *
 * EstratÃ©gia:
 * - Regras explÃ­citas para Googlebot e Bingbot (os dois motores
 *   relevantes para o mercado PT) + regra genÃ©rica para os restantes.
 * - Bloqueia tudo o que Ã© privado, transacional ou stateful:
 *   admin, API, Ã¡rea de cliente, autenticaÃ§Ã£o e passos do funil
 *   de reserva (dependem de sessÃ£o â€” crawl geraria soft-404s).
 * - /marcacoes (passo 1) fica INDEXÃVEL â€” Ã© landing page valiosa
 *   para "marcar cabeleireiro Cascais". Apenas os sub-passos
 *   (/marcacoes/horario, /marcacoes/confirmar, /marcacoes/[nÂº])
 *   sÃ£o bloqueados via "Disallow: /marcacoes/" (trailing slash
 *   bloqueia sub-rotas mas nÃ£o a rota exata).
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
  '/marcacoes/', // bloqueia sub-passos do funil; /marcacoes (exato) continua permitido
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
        // Bing respeita crawl-delay â€” 1s evita picos nas serverless functions
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
