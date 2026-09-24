// ðŸ“„ src/components/seo/LocalBusinessJsonLd.tsx
/**
 * Chi Sublime â€” Structured Data (JSON-LD) Â· Schema.org HairSalon
 * ============================================================
 *
 * O sitemap/robots dizem aos bots O QUE rastrear; o JSON-LD diz
 * O QUE o negÃ³cio Ã‰. Para um salÃ£o local em Cascais, este Ã© o
 * fator decisivo para:
 * - Rich results no Google (horÃ¡rio, morada, telefone no SERP)
 * - Local Pack / Google Maps (reforÃ§a o Google Business Profile)
 * - Bing Places
 *
 * âœ… Dados confirmados:
 *    HorÃ¡rio: derivado de SALON_HOURS (constants/business.ts)
 *    â†’ TerÃ§a a SÃ¡bado 09:00â€“18:00 Â· Segunda e Domingo encerrado
 *    GPS: 38.709560, -9.446915 (Google Maps do salÃ£o)
 *
 * âš ï¸ NÃ£o escrever horas Ã  mÃ£o aqui. O openingHoursSpecification
 * Ã© gerado a partir da fonte de verdade â€” assim o que o Google
 * mostra no SERP nunca diverge do que o site mostra.
 */

import { groupSalonHours, SCHEMA_ORG_DAYS } from '@/lib/constants/business';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.chisublime.pt';

/**
 * Gera o openingHoursSpecification a partir de SALON_HOURS.
 * SÃ³ os dias ABERTOS entram â€” a ausÃªncia de um dia jÃ¡ significa
 * "encerrado" para o Schema.org, e Ã© o que o Google espera.
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
  name: 'Chi Sublime â€” Hair Style & Beauty',
  url: BASE_URL,
  logo: `${BASE_URL}/images/logo.png`,
  image: `${BASE_URL}/images/salao_novo.jpg`,
  description:
    'SalÃ£o de beleza premium em Quinta da Bicuda, Cascais. Cabeleireiro, maquilhagem, sobrancelhas, unhas e depilaÃ§Ã£o.',
  telephone: '+351932932691',
  priceRange: 'â‚¬â‚¬',
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
      urlTemplate: `${BASE_URL}/marcacoes`,
      inLanguage: 'pt-PT',
      actionPlatform: [
        'http://schema.org/DesktopWebPlatform',
        'http://schema.org/MobileWebPlatform',
      ],
    },
    result: { '@type': 'Reservation', name: 'MarcaÃ§Ã£o Chi Sublime' },
  },
} as const;

export function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify de objeto controlado â€” sem input de utilizador
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
