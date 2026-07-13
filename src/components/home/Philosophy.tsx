// 📄 src/components/home/Philosophy.tsx
/**
 * Chi Sublime — Philosophy
 * ============================================================
 *
 * Secção-statement: a citação É a secção, em corpo display,
 * sem aspas decorativas nem moldura dourada offset.
 * Layout assimétrico: texto largo à esquerda, imagem alta à
 * direita com legenda — ritmo diferente do resto da página.
 */

import Image from 'next/image';
import { Reveal } from '@/components/shared/Reveal';

export function Philosophy() {
  return (
    <section className="bg-chi-cream py-28 md:py-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 md:grid-cols-[1.4fr_1fr] md:gap-24 md:px-12">
        {/* Coluna de texto */}
        <div className="flex flex-col justify-center">
          <Reveal>
            <span className="eyebrow text-chi-gold-deep mb-10 block">A nossa filosofia</span>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="text-chi-green-deep text-display-lg mb-12 max-w-2xl font-serif text-balance">
              A verdadeira beleza vive na atenção aos pequenos detalhes — no toque, no tempo, na
              escuta.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="max-w-lg">
              <p className="text-chi-charcoal-soft mb-6 text-base leading-[1.9] md:text-lg">
                No coração de Cascais, o Chi Sublime é mais do que um salão: é um refúgio sensorial
                onde cada visita celebra a sua individualidade.
              </p>
              <p className="text-chi-charcoal-soft text-base leading-[1.9] md:text-lg">
                A nossa equipa combina técnica refinada com produtos de excelência para criar
                experiências verdadeiramente memoráveis — sem pressa, sem fórmulas.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Coluna de imagem — alta, com legenda editorial */}
        <Reveal delay={0.15} as="figure" className="m-0">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Image
              src="/images/philosophy.jpg"
              alt="Espaço Chi Sublime"
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 38vw"
              className="object-cover"
            />
          </div>
          <figcaption className="text-chi-charcoal-light mt-4 flex items-baseline justify-between text-[11px] tracking-[0.18em] uppercase">
            <span>Quinta da Bicuda</span>
            <span>Cascais, Portugal</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
