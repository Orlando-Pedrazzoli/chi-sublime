import Image from 'next/image';

const GALLERY_ITEMS = [
  {
    src: '/images/philosophy.jpg',
    alt: 'Espaço Chi Sublime',
    span: 'tall',
  },
  {
    src: '/images/hero.jpg',
    alt: 'Interior do salão',
    span: 'wide',
  },
  {
    src: '/images/services/detalhe4.jpg',
    alt: 'Cabelereiro',
    span: 'default',
  },
  {
    src: '/images/services/detalhe5.jpg',
    alt: 'Maquilhagem',
    span: 'default',
  },
  {
    src: '/images/services/sobrancelhas.jpg',
    alt: 'Sobrancelhas',
    span: 'default',
  },
  {
    src: '/images/services/detalhe3.jpg',
    alt: 'Depilação',
    span: 'wide',
  },
  {
    src: '/images/services/unhas.jpg',
    alt: 'Unhas',
    span: 'default',
  },
];

const SPAN_CLASSES: Record<string, string> = {
  tall: 'row-span-2',
  wide: 'col-span-2',
  default: '',
};

export function GalleryPreview() {
  return (
    <section id="gallery" className="bg-chi-sand py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Header alinhado à esquerda */}
        <div className="mb-16">
          <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
            — O nosso espaço —
          </span>
          <h2 className="text-chi-charcoal font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
            Um refúgio em <span className="text-chi-green-deep italic">Cascais</span>.
          </h2>
        </div>

        {/* Grid masonry */}
        <div className="grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {GALLERY_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`group relative cursor-pointer overflow-hidden ${SPAN_CLASSES[item.span]}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                quality={80}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Overlay no hover */}
              <div className="bg-chi-green-deep/0 group-hover:bg-chi-green-deep/40 absolute inset-0 transition-colors duration-500" />
              {/* Gradient bottom subtil */}
              <div className="to-chi-green-deep/35 pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
