// 📄 src/components/home/TeamPreview.tsx
/**
 * Chi Sublime — TeamPreview
 * ============================================================
 *
 * Secção "A nossa equipa" da homepage, 100% gerida no admin
 * (/admin/equipa): nome, foto, função, especialidade, ordem e
 * visibilidade vêm do modelo Staff.
 *
 * Mostra profissionais com active !== false E showOnWebsite !== false,
 * ordenados por `order` e nome. Sem profissionais visíveis, a secção
 * não é renderizada.
 *
 * Layout adaptativo ao número de profissionais:
 *   1  → card único centrado
 *   2  → 2 colunas, a segunda desce em desktop
 *   4  → 4 colunas em desktop, colunas pares descem
 *   3, 5+ → 3 colunas em desktop, coluna central de cada linha desce
 *
 * As classes de grid são strings literais (o Tailwind v4 só gera
 * classes que encontra no código). Espaçamentos e cores críticos
 * ficam em `style` inline — o build de produção descarta algumas
 * utilities de padding/cor.
 *
 * i18n: textos da secção em home.team; role/specialty com fallback
 * PT via localizedField.
 */

import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { connectDB } from '@/lib/db/connect';
import { Staff } from '@/lib/models';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { isOptimizableImage } from '@/lib/utils/image';
import { Reveal } from '@/components/shared/Reveal';

type TeamMember = {
  id: string;
  slug: string;
  name: string;
  role: string;
  specialty: string;
  photo?: string;
};

type LocalizedDoc = { pt?: string; en?: string } | undefined;

async function getTeam(locale: Locale): Promise<TeamMember[]> {
  try {
    await connectDB();
    const docs = await Staff.find({
      active: { $ne: false },
      showOnWebsite: { $ne: false },
    })
      .select('name slug role specialty photo order')
      .sort({ order: 1, name: 1 })
      .lean();

    return docs.map((d) => ({
      id: String(d._id),
      slug: d.slug,
      name: d.name,
      role: localizedField(d.role as LocalizedDoc, locale),
      specialty: localizedField(d.specialty as LocalizedDoc, locale),
      photo: d.photo || undefined,
    }));
  } catch (err) {
    // Uma falha da BD não pode derrubar a homepage inteira
    console.error('[TeamPreview]', err);
    return [];
  }
}

function getLayout(count: number) {
  if (count === 1) {
    return { grid: 'mx-auto grid max-w-md grid-cols-1 gap-12', offset: () => undefined };
  }
  if (count === 2) {
    return {
      grid: 'mx-auto grid max-w-4xl grid-cols-1 gap-12 sm:grid-cols-2 md:gap-10',
      offset: (i: number) => (i === 1 ? 'sm:mt-20' : undefined),
    };
  }
  if (count === 4) {
    return {
      grid: 'grid grid-cols-1 gap-12 sm:grid-cols-2 md:gap-10 lg:grid-cols-4 lg:gap-8',
      offset: (i: number) => (i % 2 === 1 ? 'lg:mt-20' : undefined),
    };
  }
  return {
    grid: 'grid grid-cols-1 gap-12 sm:grid-cols-2 md:gap-10 lg:grid-cols-3',
    offset: (i: number) => (i % 3 === 1 ? 'lg:mt-20' : undefined),
  };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export async function TeamPreview() {
  const locale = (await getLocale()) as Locale;
  const [t, team] = await Promise.all([getTranslations('home.team'), getTeam(locale)]);

  if (team.length === 0) return null;

  const layout = getLayout(team.length);
  const sizes =
    team.length === 4
      ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return (
    <section id="team" className="bg-chi-cream py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header — alinhado à esquerda, com texto de apoio à direita */}
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <span className="eyebrow text-chi-gold-deep mb-8 block">{t('eyebrow')}</span>
            <h2 className="text-chi-green-deep text-display-lg max-w-xl font-serif text-balance">
              {t('title')}
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-chi-charcoal-soft max-w-sm text-base leading-[1.85]">{t('intro')}</p>
          </Reveal>
        </div>

        <div className={layout.grid}>
          {team.map((member, i) => (
            <Reveal key={member.id} delay={Math.min(i, 5) * 0.1} className={layout.offset(i)}>
              <Link href={`/equipa/${member.slug}`} className="group block">
                <div
                  className="relative mb-6 aspect-[3/4] overflow-hidden"
                  style={{ backgroundColor: 'var(--color-chi-sand)' }}
                >
                  {member.photo ? (
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      quality={85}
                      sizes={sizes}
                      unoptimized={!isOptimizableImage(member.photo)}
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center font-serif"
                      style={{ fontSize: '4.5rem', color: 'var(--color-chi-sand-deep)' }}
                      aria-hidden="true"
                    >
                      {initials(member.name)}
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-chi-charcoal group-hover:text-chi-green-deep font-serif text-2xl transition-colors duration-300 md:text-[1.75rem]">
                    {member.name}
                  </h3>
                  {member.role && (
                    <span
                      className="shrink-0 text-right text-[10px] tracking-[0.25em] uppercase"
                      style={{ color: 'var(--color-chi-gold-deep)' }}
                    >
                      {member.role}
                    </span>
                  )}
                </div>
                {member.specialty && (
                  <p
                    className="text-sm leading-[1.7]"
                    style={{ color: 'var(--color-chi-charcoal-soft)', marginTop: '0.5rem' }}
                  >
                    {member.specialty}
                  </p>
                )}
                <span
                  className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ color: 'var(--color-chi-gold-deep)', marginTop: '0.75rem' }}
                >
                  {t('viewProfile')} →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
