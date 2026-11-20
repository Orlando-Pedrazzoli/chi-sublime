// 📄 src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { SITE_URL } from '@/lib/seo/site';
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
   ------------------------------------------------------------
   - O title da home leva a pesquisa principal ("cabeleireiro" +
     "salão de beleza" + "Cascais"), não só a marca.
   - O template acrescenta " | Chi Sublime" às páginas internas:
     os titles das páginas NÃO devem repetir a marca.
   - Sem `alternateLocale`: o inglês é servido por cookie, não tem
     URL própria — anunciar en_US apontava para uma versão que o
     Google não consegue abrir.
   ============================================================ */

const HOME_TITLE = 'Chi Sublime | Cabeleireiro e Salão de Beleza em Cascais';
const HOME_DESCRIPTION =
  'Cabeleireiro e salão de beleza em Cascais, na Quinta da Bicuda. Cortes, coloração, madeixas, extensões, sobrancelhas, maquilhagem, unhas e depilação. Veja os preços e marque online.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: '%s | Chi Sublime',
  },
  description: HOME_DESCRIPTION,
  keywords: [
    'salão de beleza Cascais',
    'cabeleireiro Cascais',
    'marcações online Cascais',
    'marcação cabeleireiro Cascais',
    'marcação online salão de beleza',
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
    url: SITE_URL,
    siteName: 'Chi Sublime',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Chi Sublime — cabeleireiro e salão de beleza em Cascais',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/images/og-image.jpg'],
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

  /* Verificação do Google Search Console: feita por DNS (propriedade
     de domínio chisublime.pt) — não é precisa meta tag aqui.
     Bing Webmaster Tools: usar "Importar do Google Search Console". */

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
            {/* Banner RGPD — client component, só renderiza sem consentimento */}
            <CookieBanner />
            {/* Botão flutuante WhatsApp — só páginas públicas, aparece após consentimento */}
            <WhatsAppFab />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
