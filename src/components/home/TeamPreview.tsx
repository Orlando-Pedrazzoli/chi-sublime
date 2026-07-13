// 📄 src/components/home/TeamPreview.tsx
/**
 * Chi Sublime — TeamPreview
 * ============================================================
 *
 * Grid escalonado (a coluna central desce em desktop) para
 * quebrar a simetria de "3 cards iguais". Sem citações entre
 * aspas — apenas nome, papel e especialidade em texto direto.
 *
 * Hover: scale 1.03 na imagem, nada mais.
 */

import Image from 'next/image';
import { Reveal } from '@/components/shared/Reveal';

const TEAM = [
  {
    slug: 'jean-pierre',
    name: 'Jean Pierre',
    role: 'Founder · Hair Artist',
    specialty: 'Coloração e transformações capilares',
    image: '/images/team/jean-pierre.jpg',
  },
  {
    slug: 'matias',
    name: 'Matias',
    role: 'Senior Stylist',
    specialty: 'Cortes de precisão e styling',
    image: '/images/team/matias.jpg',
  },
  {
    slug: 'ana-rita',
    name: 'Ana Rita',
    role: 'Beauty Specialist',
    specialty: 'Maquilhagem, sobrancelhas e unhas',
    image: '/images/team/ana-rita.jpg',
  },
];

export function TeamPreview() {
  return (
    <section id="team" className="bg-chi-cream py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header — alinhado à esquerda, com texto de apoio à direita */}
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <span className="eyebrow text-chi-gold-deep mb-8 block">A nossa equipa</span>
            <h2 className="text-chi-green-deep text-display-lg max-w-xl font-serif text-balance">
              Três profissionais, uma só atenção
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-chi-charcoal-soft max-w-sm text-base leading-[1.85]">
              Conheça quem está por trás de cada experiência Chi Sublime — e escolha com quem quer
              estar.
            </p>
          </Reveal>
        </div>

        {/* Grid escalonado */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
          {TEAM.map((member, i) => (
            <Reveal key={member.slug} delay={i * 0.1} className={i === 1 ? 'lg:mt-20' : undefined}>
              <article className="group">
                <div className="relative mb-6 aspect-[3/4] overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    quality={85}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-chi-charcoal font-serif text-2xl md:text-[1.75rem]">
                    {member.name}
                  </h3>
                  <span className="text-chi-gold-deep shrink-0 text-[10px] tracking-[0.25em] uppercase">
                    {member.role}
                  </span>
                </div>
                <p className="text-chi-charcoal-soft mt-2 text-sm leading-[1.7]">
                  {member.specialty}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
