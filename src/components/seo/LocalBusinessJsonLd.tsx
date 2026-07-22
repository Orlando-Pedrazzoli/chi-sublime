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
 *    Horário: Seg–Sex 10:00–19:00 · Sáb/Dom encerrado
 *    GPS: 38.709560, -9.446915 (Google Maps do salão)
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

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
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '10:00',
      closes: '19:00',
    },
  ],
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
