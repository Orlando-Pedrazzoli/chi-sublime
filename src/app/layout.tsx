import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';

/* ============================================================
   FONTES — Carregadas via next/font (otimização automática)
   - Fraunces: serifa display moderna com optical sizing
     (substitui Cormorant Garamond — melhor legibilidade)
   - Manrope: sans-serif moderna para corpo de texto
   ============================================================ */

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

/* ============================================================
   METADATA SEO + Open Graph
   ============================================================ */

export const metadata: Metadata = {
  metadataBase: new URL('https://www.chisublime.pt'),
  title: {
    default: 'Chi Sublime — Hair Style & Beauty | Cascais',
    template: '%s | Chi Sublime',
  },
  description:
    'Salão de beleza premium em Quinta da Bicuda, Cascais. Cabelereiro, maquilhagem, sobrancelhas, unhas e depilação com a equipa de Jean Pierre, Matias e Ana Rita.',
  keywords: [
    'salão de beleza Cascais',
    'cabelereiro Cascais',
    'Quinta da Bicuda',
    'hair salon Cascais',
    'beauty salon Cascais',
    'maquilhagem noiva Cascais',
    'brow lamination Cascais',
    'extensão fio a fio Cascais',
  ],
  authors: [{ name: 'Pedrazzoli Digital' }],
  creator: 'Pedrazzoli Digital',
  publisher: 'Chi Sublime',

  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    alternateLocale: 'en_US',
    url: 'https://www.chisublime.pt',
    siteName: 'Chi Sublime',
    title: 'Chi Sublime — Hair Style & Beauty | Cascais',
    description: 'Um refúgio de beleza premium em Quinta da Bicuda, Cascais.',
    images: [
      {
        url: '/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'Chi Sublime — Hair Style & Beauty',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Chi Sublime — Hair Style & Beauty | Cascais',
    description: 'Um refúgio de beleza premium em Cascais.',
    images: ['/images/logo.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  /* ── Verificação de propriedade — Search Console / Webmaster Tools ──
     Google Search Console → método "Meta tag HTML" → copiar APENAS o
     valor do atributo content (não a tag inteira).
     Bing Webmaster Tools → "Meta tag" → valor do content de msvalidate.01.
     Dica: no Bing, usa "Importar do Google Search Console" e nem
     precisas do código — mas deixo o campo pronto na mesma. */
  verification: {
    google: 'COLAR_AQUI_CODIGO_GOOGLE', // <meta name="google-site-verification" content="...">
    other: {
      'msvalidate.01': 'COLAR_AQUI_CODIGO_BING', // <meta name="msvalidate.01" content="...">
    },
  },

  category: 'beauty',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#1F3D2E' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/* ============================================================
   ROOT LAYOUT
   Aplica-se a TODAS as páginas (público, admin, auth, etc.)
   ============================================================ */

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale vem do cookie NEXT_LOCALE (ver src/i18n/request.ts)
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-chi-cream text-chi-charcoal antialiased">
        <LocalBusinessJsonLd />
        {/* Sem prop `messages`: herda as mensagens do request.ts automaticamente */}
        <NextIntlClientProvider>
          <SessionProvider>
            <ToastProvider>{children}</ToastProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
