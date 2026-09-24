// 📄 next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Aponta para a config de request do next-intl (lê o cookie de locale)
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 80, 85, 90, 95],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  /**
   * Redirects 301 (permanent) — o funil de marcações passou de
   * /reservar para /marcacoes. Links antigos (emails de confirmação,
   * Google, Instagram bio, favoritos) continuam a funcionar e o
   * Google transfere a autoridade para o novo URL.
   *
   * /book e /booking são atalhos curtos (estilo Noona) para usar em
   * bios e QR codes: chisublime.pt/book → /marcacoes.
   */
  async redirects() {
    return [
      { source: '/reservar', destination: '/marcacoes', permanent: true },
      { source: '/reservar/:path*', destination: '/marcacoes/:path*', permanent: true },
      { source: '/book', destination: '/marcacoes', permanent: true },
      { source: '/booking', destination: '/marcacoes', permanent: true },
      { source: '/marcacao', destination: '/marcacoes', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
