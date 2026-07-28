// 📄 src/components/seo/LocalBusinessJsonLd.tsx
/**
 * Chi Sublime — Structured Data (JSON-LD) · Schema.org HairSalon
 * ============================================================
 *
 * O sitemap/robots dizem aos bots O QUE rastrear; o JSON-LD diz
 * O QUE o negócio É. Para um salão local em Cascais, este é o
 * fator decisivo para:
 * - Rich results no Google (horário, morada, telefone no SERP)
 * - Local Pack / Google Maps (reforça o Google Business Profile)
 * - Bing Places
 *
 * ✅ Dados confirmados:
 *    Horário: derivado de SALON_HOURS (constants/business.ts)
 *    → Terça a Sábado 09:00–18:00 · Segunda e Domingo encerrado
 *    GPS: 38.709560, -9.446915 (Google Maps do salão)
 *
 * ⚠️ Não escrever horas à mão aqui. O openingHoursSpecification
 * é gerado a partir da fonte de verdade — assim o que o Google
 * mostra no SERP nunca diverge do que o site mostra.
 */

import { groupSalonHours, SCHEMA_ORG_DAYS } from '@/lib/constants/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

/**
 * Gera o openingHoursSpecification a partir de SALON_HOURS.
 * Só os dias ABERTOS entram — a ausência de um dia já significa
 * "encerrado" para o Schema.org, e é o que o Google espera.
 */
const openingHoursSpecification = groupSalonHours()
  .filter((g) => g.open)
  .map((g) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: g.days.map((d) => SCHEMA_ORG_DAYS[d]),
    opens: g.start!,
    closes: g.end!,
  }));

const schema = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  '@id': `${BASE_URL}/#salon`,
  name: 'Chi Sublime — Hair Style & Beauty',
  url: BASE_URL,
  logo: `${BASE_URL}/images/logo.png`,
  image: `${BASE_URL}/images/salao_novo.jpg`,
  description:
    'Salão de beleza premium em Quinta da Bicuda, Cascais. Cabeleireiro, maquilhagem, sobrancelhas, unhas e depilação.',
  telephone: '+351932932691',
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Cash, Credit Card, MB Way',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua do Estorninho, Loja E, Quinta da Bicuda',
    addressLocality: 'Cascais',
    postalCode: '2750-686',
    addressRegion: 'Lisboa',
    addressCountry: 'PT',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 38.70956,
    longitude: -9.446915,
  },
  hasMap: 'https://maps.google.com/?q=38.709560,-9.446915',
  openingHoursSpecification,
  areaServed: [
    { '@type': 'City', name: 'Cascais' },
    { '@type': 'City', name: 'Estoril' },
    { '@type': 'City', name: 'Oeiras' },
    { '@type': 'City', name: 'Sintra' },
    { '@type': 'City', name: 'Lisboa' },
  ],
  potentialAction: {
    '@type': 'ReserveAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/reservar`,
      inLanguage: 'pt-PT',
      actionPlatform: [
        'http://schema.org/DesktopWebPlatform',
        'http://schema.org/MobileWebPlatform',
      ],
    },
    result: { '@type': 'Reservation', name: 'Marcação Chi Sublime' },
  },
} as const;

export function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify de objeto controlado — sem input de utilizador
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
