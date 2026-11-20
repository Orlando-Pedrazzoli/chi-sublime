// 📄 src/lib/seo/site.ts
/**
 * Chi Sublime — SEO: fonte única de verdade
 * ============================================================
 *
 * Domínio canónico, identidade do salão (NAP) e helpers de
 * URL/JSON-LD usados por sitemap, robots, metadata e schemas.
 *
 * ⚠️ SITE_URL é uma CONSTANTE de propósito (não vem de env):
 * canonical, sitemap e JSON-LD têm de apontar sempre para o
 * domínio de produção — mesmo em previews da Vercel — senão o
 * Google recebe URLs divergentes entre ficheiros.
 */

export const SITE_URL = 'https://www.chisublime.pt';

/** @id da entidade principal — todos os schemas referenciam este nó */
export const SALON_ID = `${SITE_URL}/#salon`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const SALON = {
  name: 'Chi Sublime',
  legalName: 'Chi Sublime — Hair Style & Beauty',
  phoneE164: '+351932932691',
  phoneDisplay: '+351 932 932 691',
  street: 'Rua do Estorninho, Loja E',
  neighbourhood: 'Quinta da Bicuda',
  postalCode: '2750-686',
  city: 'Cascais',
  region: 'Lisboa',
  country: 'PT',
  latitude: 38.70956,
  longitude: -9.446915,
  mapsUrl: 'https://maps.google.com/?q=38.709560,-9.446915',
  instagram: 'https://www.instagram.com/chiptsublime/',
} as const;

/**
 * Slugs antigos de categorias → slug atual.
 * "cabelereiro" era um erro ortográfico (o correto é "cabeleireiro");
 * a página de categoria faz 301 do antigo para o novo.
 */
export const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  cabelereiro: 'cabeleireiro',
};

/* ── URLs ─────────────────────────────────────────────────── */

export const absoluteUrl = (path = '/') => `${SITE_URL}${path === '/' ? '' : path}`;

export const categoryPath = (categorySlug: string) => `/servicos/${categorySlug}`;

export const servicePath = (categorySlug: string, serviceSlug: string) =>
  `/servicos/${categorySlug}/${serviceSlug}`;

export const staffPath = (staffSlug: string) => `/equipa/${staffSlug}`;

/* ── Formatação ───────────────────────────────────────────── */

export function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/* ── JSON-LD ──────────────────────────────────────────────── */

type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

type ServiceLd = {
  name: string;
  description?: string;
  categoryName: string;
  categorySlug: string;
  slug: string;
  price: number;
};

/** Nó Service + Offer, ligado ao salão por @id */
export function serviceJsonLd(s: ServiceLd) {
  const url = absoluteUrl(servicePath(s.categorySlug, s.slug));
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: s.name,
    url,
    serviceType: s.categoryName,
    ...(s.description ? { description: s.description } : {}),
    provider: { '@id': SALON_ID },
    areaServed: { '@type': 'City', name: 'Cascais' },
    offers: {
      '@type': 'Offer',
      url,
      price: (s.price / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };
}

/**
 * Serializa JSON-LD para <script>. Escapa "<" para que texto vindo
 * da BD (descrições editadas no admin) nunca feche a tag.
 */
export function jsonLdScript(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') };
}
