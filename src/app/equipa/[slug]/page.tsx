// 📄 src/app/equipa/[slug]/page.tsx
/**
 * Chi Sublime — Perfil de profissional (página pública)
 * ============================================================
 *
 * Perfis dos profissionais são um dos 5 não-negociáveis de um
 * site de salão: o cliente escolhe pessoas, não só serviços.
 *
 * Mostra foto, role, bio, especialidade e os serviços que o
 * profissional presta (staffIds vazio num serviço = qualquer
 * profissional o presta). CTA → /reservar.
 *
 * ISR de 10 min. JSON-LD Person para SEO.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { Service, Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Reveal } from '@/components/shared/Reveal';

export const revalidate = 600;

// ============================================================
// DATA
// ============================================================

async function getStaffData(slug: string) {
  await connectDB();

  const staff = await Staff.findOne({ slug, active: true }).lean();
  if (!staff) return null;

  // Serviços que este profissional presta:
  // staffIds vazio/ausente = qualquer profissional pode prestar
  const services = await Service.find({
    active: true,
    $or: [{ staffIds: { $size: 0 } }, { staffIds: { $exists: false } }, { staffIds: staff._id }],
  })
    .sort({ order: 1, 'name.pt': 1 })
    .populate('categoryId', 'name slug order')
    .lean();

  return {
    staff: {
      name: staff.name,
      role: staff.role.pt,
      bio: staff.bio?.pt,
      specialty: staff.specialty?.pt,
      photo: staff.photo,
    },
    services: services.map((s) => ({
      id: String(s._id),
      name: s.name.pt,
      duration: s.duration,
      price: s.price,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryName: (s.categoryId as any)?.name?.pt ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryOrder: (s.categoryId as any)?.order ?? 0,
    })),
  };
}

// ============================================================
// METADATA
// ============================================================

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStaffData(slug);
  if (!data) return { title: 'Equipa' };

  return {
    title: `${data.staff.name} — ${data.staff.role}`,
    description:
      data.staff.bio ??
      `${data.staff.name}, ${data.staff.role} no Chi Sublime — Hair Style & Beauty, Cascais.`,
    alternates: { canonical: `/equipa/${slug}` },
  };
}

// ============================================================
// HELPERS
// ============================================================

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ============================================================
// PAGE
// ============================================================

export default async function EquipaPerfilPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getStaffData(slug);
  if (!data) notFound();

  const { staff, services } = data;

  // Agrupar serviços por categoria (ordem da categoria).
  // Nota TS: criar a entry explicitamente (em vez de `?? { items: [] }`)
  // evita que o literal infira `items: never[]` e quebre o push.
  type ServiceItem = (typeof services)[number];
  const byCategory = new Map<string, { order: number; items: ServiceItem[] }>();
  for (const s of services) {
    let entry = byCategory.get(s.categoryName);
    if (!entry) {
      entry = { order: Number(s.categoryOrder) || 0, items: [] };
      byCategory.set(s.categoryName, entry);
    }
    entry.items.push(s);
  }
  const groups = [...byCategory.entries()].sort((a, b) => a[1].order - b[1].order);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: staff.name,
    jobTitle: staff.role,
    ...(staff.bio ? { description: staff.bio } : {}),
    worksFor: {
      '@type': 'HairSalon',
      name: 'Chi Sublime',
      address: { '@type': 'PostalAddress', addressLocality: 'Cascais', addressCountry: 'PT' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-32 pb-24 md:pt-40">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-[380px_1fr] md:gap-20 md:px-12">
          {/* Coluna esquerda — foto + identidade (sticky em desktop) */}
          <Reveal as="figure" className="m-0 md:sticky md:top-28 md:self-start">
            <div className="bg-chi-sand relative aspect-[3/4] overflow-hidden">
              {staff.photo ? (
                <Image
                  src={staff.photo}
                  alt={staff.name}
                  fill
                  priority
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover"
                />
              ) : (
                <div className="text-chi-charcoal-light flex h-full w-full items-center justify-center font-serif text-7xl">
                  {staff.name.charAt(0)}
                </div>
              )}
            </div>
            <figcaption className="mt-6">
              <p className="eyebrow text-chi-gold-deep mb-4">{staff.role}</p>
              <h1 className="text-chi-charcoal font-serif text-4xl md:text-5xl">{staff.name}</h1>
              {staff.specialty && (
                <p className="text-chi-charcoal-soft mt-3 text-sm leading-relaxed">
                  {staff.specialty}
                </p>
              )}
              <Link
                href="/reservar"
                className="bg-chi-gold hover:bg-chi-gold-soft mt-8 inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E', borderRadius: '8px' }}
              >
                Marcar com {staff.name.split(/\s+/)[0]}
              </Link>
            </figcaption>
          </Reveal>

          {/* Coluna direita — bio + serviços */}
          <div>
            {staff.bio && (
              <Reveal delay={0.1}>
                <p className="text-chi-charcoal mb-14 max-w-2xl font-serif text-2xl leading-[1.5] text-balance md:text-3xl">
                  {staff.bio}
                </p>
              </Reveal>
            )}

            <Reveal delay={0.15}>
              <p className="eyebrow text-chi-gold-deep mb-8">Serviços</p>
            </Reveal>

            {groups.length === 0 ? (
              <p className="text-chi-charcoal-soft font-serif italic">
                Serviços em atualização — reserve online para ver a disponibilidade.
              </p>
            ) : (
              <div className="space-y-12">
                {groups.map(([categoryName, group], gi) => (
                  <Reveal key={categoryName} delay={0.1 + gi * 0.05}>
                    <div>
                      <h2 className="text-chi-green-deep mb-4 font-serif text-xl md:text-2xl">
                        {categoryName}
                      </h2>
                      <ul className="border-chi-border border-t">
                        {group.items.map((s) => (
                          <li
                            key={s.id}
                            className="border-chi-border flex items-baseline justify-between gap-6 border-b py-4"
                          >
                            <div className="min-w-0">
                              <p className="text-chi-charcoal truncate text-base">{s.name}</p>
                              <p className="text-chi-charcoal-light mt-0.5 text-xs tracking-[0.12em] uppercase">
                                {formatDuration(s.duration)}
                              </p>
                            </div>
                            <span className="text-chi-green-deep shrink-0 font-mono text-base font-medium">
                              {formatPrice(s.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
