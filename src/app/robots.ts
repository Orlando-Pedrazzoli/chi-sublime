// 📄 src/app/robots.ts
/**
 * Chi Sublime — robots.txt dinâmico (Next.js Metadata Route)
 * ============================================================
 *
 * Gerado em: https://www.chisublime.pt/robots.txt
 *
 * Duas ferramentas diferentes, que não se podem misturar:
 *
 * - robots.txt (este ficheiro) → impede o RASTREIO. Usado só para
 *   o que nenhum bot tem de pedir: admin, API e área de cliente
 *   (que de qualquer forma redirecionam para o login).
 *
 * - meta robots "noindex" (na metadata de cada página) → impede a
 *   INDEXAÇÃO. Usado em /entrar, /registar, recuperação de password
 *   e nos passos do funil (/marcacoes/horario, /confirmar, /[nº]).
 *
 * Estas páginas "noindex" NÃO podem estar no Disallow: se o Google
 * não as puder rastrear, nunca lê o noindex e pode listá-las como
 * "Indexada, mas bloqueada pelo robots.txt" (o /entrar está no menu
 * de todas as páginas, por isso o Google descobre-o sempre).
 */

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/conta'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
