import Image from 'next/image';

export function Philosophy() {
  return (
    <section className="bg-chi-cream py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[1fr_1.3fr] md:gap-20 md:px-12">
        {/* Imagem com moldura dourada */}
        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src="/images/philosophy.jpg"
              alt="Espaço Chi Sublime"
              fill
              quality={85}
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
          {/* Moldura dourada decorativa */}
          <div className="border-chi-gold absolute -top-5 -right-5 -z-10 hidden h-full w-full border md:block" />
        </div>

        {/* Texto editorial */}
        <div>
          <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
            — A nossa filosofia —
          </span>

          <h2 className="text-chi-charcoal mb-8 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
            Onde o cuidado encontra a <span className="text-chi-green-deep italic">arte</span>.
          </h2>

          {/* Divisor dourado */}
          <div className="bg-chi-gold mb-8 h-px w-16" />

          {/* Citação em itálico */}
          <p className="text-chi-charcoal mb-8 font-serif text-2xl leading-[1.5] font-light italic md:text-3xl lg:text-[2rem]">
            &ldquo;Acreditamos que a verdadeira beleza vive na atenção aos pequenos detalhes — no
            toque, no tempo, na escuta.&rdquo;
          </p>

          {/* Texto de apoio */}
          <p className="text-chi-charcoal-soft text-base leading-[1.85] md:text-lg">
            No coração de Cascais, o Chi Sublime é mais do que um salão. É um refúgio sensorial onde
            cada visita é uma celebração da sua individualidade. A nossa equipa combina técnica
            refinada com produtos de excelência para criar experiências verdadeiramente memoráveis.
          </p>
        </div>
      </div>
    </section>
  );
}
