// 📄 src/components/seo/LocalBusinessJsonLd.tsx
/**
 * Chi Sublime — Structured Data (JSON-LD) · Schema.org HairSalon
 * ============================================================
 *
 * Nó principal do grafo de entidades do site. Tudo o resto
 * (serviços, profissionais, catálogo) aponta para ele por @id
 * (`SALON_ID`), em vez de repetir "Chi Sublime" como texto solto:
 *
 *   WebSite ──publisher──▶ HairSalon (#salon)
 *   Service ──provider───▶ HairSalon
 *   Person  ──worksFor───▶ HairSalon
 *   HairSalon ──hasOfferCatalog──▶ categorias (emitido na home)
 *
 * ✅ Horário: derivado de SALON_HOURS (constants/business.ts) —
 *    nunca escrever horas à mão aqui.
 * ✅ Morada, telefone e GPS: SALON (lib/seo/site.ts). Têm de ser
 *    IGUAIS aos da ficha Google Business Profile (NAP).
 *
 * ⚠️ `sameAs` só leva perfis oficiais confirmados. Quando tiveres
 *    o link da ficha Google (botão "Partilhar" no Google Maps) e a
 *    página de Facebook certa, acrescenta-os ao array.
 */

import { groupSalonHours, SCHEMA_ORG_DAYS } from '@/lib/constants/business';
import { SALON, SALON_ID, SITE_URL, WEBSITE_ID, jsonLdScript } from '@/lib/seo/site';

/**
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
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: SALON.name,
      alternateName: SALON.legalName,
      inLanguage: 'pt-PT',
      publisher: { '@id': SALON_ID },
    },
    {
      '@type': 'HairSalon',
      '@id': SALON_ID,
      name: SALON.name,
      alternateName: SALON.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      image: [`${SITE_URL}/images/salao_novo.jpg`, `${SITE_URL}/images/og-image.jpg`],
      description:
        'Cabeleireiro e salão de beleza em Cascais, na Quinta da Bicuda. Cortes, coloração, madeixas, extensões, sobrancelhas, maquilhagem, unhas e depilação.',
      telephone: SALON.phoneE164,
      priceRange: '€€',
      currenciesAccepted: 'EUR',
      paymentAccepted: 'Cash, Credit Card, MB Way',
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${SALON.street}, ${SALON.neighbourhood}`,
        addressLocality: SALON.city,
        postalCode: SALON.postalCode,
        addressRegion: SALON.region,
        addressCountry: SALON.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: SALON.latitude,
        longitude: SALON.longitude,
      },
      hasMap: SALON.mapsUrl,
      openingHoursSpecification,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: SALON.phoneE164,
        contactType: 'reservations',
        availableLanguage: ['Portuguese', 'English'],
      },
      sameAs: [SALON.instagram],
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
          urlTemplate: `${SITE_URL}/marcacoes`,
          inLanguage: 'pt-PT',
          actionPlatform: [
            'https://schema.org/DesktopWebPlatform',
            'https://schema.org/MobileWebPlatform',
          ],
        },
        result: { '@type': 'Reservation', name: 'Marcação Chi Sublime' },
      },
    },
  ],
};

export function LocalBusinessJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(schema)} />;
}
