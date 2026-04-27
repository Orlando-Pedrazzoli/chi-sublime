import Image from 'next/image';

const TEAM = [
  {
    slug: 'jean-pierre',
    name: 'Jean Pierre',
    role: 'Founder · Hair Artist',
    specialty: 'Especialista em coloração e transformações',
    image: '/images/team/jean-pierre.jpg',
  },
  {
    slug: 'matias',
    name: 'Matias',
    role: 'Senior Stylist',
    specialty: 'O detalhe é onde mora a perfeição',
    image: '/images/team/matias.jpg',
  },
  {
    slug: 'ana-rita',
    name: 'Ana Rita',
    role: 'Beauty Specialist',
    specialty: 'Maquilhagem que revela quem você é',
    image: '/images/team/ana-rita.jpg',
  },
];

export function TeamPreview() {
  return (
    <section id="team" className="bg-chi-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        {/* Header centrado */}
        <div className="mb-16 text-center">
          <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
            — A nossa equipa —
          </span>
          <h2 className="text-chi-charcoal mb-6 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
            Mãos que <span className="text-chi-green-deep italic">cuidam</span>.
          </h2>
          <p className="text-chi-charcoal-soft mx-auto max-w-xl text-base leading-[1.85] md:text-lg">
            Três profissionais. Uma paixão partilhada pela arte da beleza. Conheça quem está por
            trás de cada experiência Chi Sublime.
          </p>
        </div>

        {/* Grid de 3 cards */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
          {TEAM.map((member) => (
            <div key={member.slug} className="group cursor-pointer text-center">
              {/* Foto em ratio 3:4 */}
              <div className="relative mb-6 aspect-[3/4] overflow-hidden">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  quality={85}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover grayscale-[0.15] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
                {/* Overlay gradiente subtil */}
                <div className="to-chi-green-deep/30 pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent" />
              </div>

              {/* Info */}
              <h3 className="text-chi-charcoal mb-2 font-serif text-2xl font-medium md:text-[1.65rem]">
                {member.name}
              </h3>
              <div className="text-chi-gold-deep mb-4 text-[10px] tracking-[0.28em] uppercase">
                {member.role}
              </div>
              <p className="text-chi-charcoal-soft font-serif text-base italic md:text-lg">
                &ldquo;{member.specialty}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
