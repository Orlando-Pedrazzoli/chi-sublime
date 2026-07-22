// 📄 src/app/manifest.ts
/**
 * Chi Sublime — Web App Manifest (Next.js Metadata Route)
 * Gerado em: /manifest.webmanifest (linkado automaticamente no <head>)
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chi Sublime — Hair Style & Beauty',
    short_name: 'Chi Sublime',
    description: 'Salão de beleza premium em Quinta da Bicuda, Cascais. Reservas online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf7f2',
    theme_color: '#1f3d2e',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
