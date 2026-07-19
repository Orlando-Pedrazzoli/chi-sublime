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
 * ⚠️ TODO (Orlando): confirmar com o Jean Pierre os campos
 * marcados com [CONFIRMAR] — telefone, morada exata, horário
 * e coordenadas GPS (copiar do Google Maps do salão).
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
  telephone: '+351000000000', // [CONFIRMAR] telefone do salão
  priceRange: '€€',
  currenciesAccepted: 'EUR',
  paymentAccepted: 'Cash, Credit Card, MB Way',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Quinta da Bicuda', // [CONFIRMAR] rua e número
    addressLocality: 'Cascais',
    postalCode: '2750-000', // [CONFIRMAR] código postal
    addressRegion: 'Lisboa',
    addressCountry: 'PT',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 38.7168, // [CONFIRMAR] copiar do Google Maps
    longitude: -9.4415,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], // [CONFIRMAR]
      opens: '09:30',
      closes: '19:00',
    },
  ],
  areaServed: [
    { '@type': 'City', name: 'Cascais' },
    { '@type': 'City', name: 'Estoril' },
    { '@type': 'City', name: 'Oeiras' },
    { '@type': 'City', name: 'Sintra' },
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
