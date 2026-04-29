import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="animate-ken-burns relative h-full w-full">
          <Image
            src="/images/hero.jpg"
            alt="Interior do salão Chi Sublime"
            fill
            priority
            quality={90}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* Overlay */}
      <div className="from-chi-green-darker/40 via-chi-green-darker/55 to-chi-green-darker/85 absolute inset-0 z-10 bg-gradient-to-b" />

      {/* Conteúdo */}
      <div className="text-chi-cream relative z-20 mx-auto max-w-3xl px-6 pt-32 text-center md:pt-36">
        <p
          className="animate-fade-up animate-fade-up-delay-1 text-chi-gold mb-6 font-serif text-sm tracking-[0.3em] uppercase italic"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
        >
          — Hair Style & Beauty · Cascais —
        </p>

        <h1
          className="animate-fade-up animate-fade-up-delay-2 mb-6 font-serif text-5xl leading-[1.05] font-light tracking-tight text-balance md:text-7xl lg:text-8xl"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
          Beleza que <span className="text-chi-gold italic">respira</span>
          <br />o tempo
        </h1>

        <p
          className="animate-fade-up animate-fade-up-delay-3 text-chi-cream/95 mx-auto mb-12 max-w-xl text-base leading-relaxed md:text-lg"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
        >
          Um espaço de cuidado refinado em Quinta da Bicuda, onde cada gesto é pensado para revelar
          a sua essência.
        </p>

        {/* BOTÕES */}
        <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col justify-center gap-5 sm:flex-row">
          {/* PRIMARY — igual navbar */}
          <Link
            href="/reservar"
            className="group bg-chi-gold text-chi-green-deep hover:bg-chi-gold-soft hover:text-chi-green-darker hover:shadow-gold relative inline-flex items-center justify-center overflow-hidden rounded-md px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all duration-300 hover:-translate-y-[2px]"
          >
            <span className="relative z-10">Agendar</span>

            {/* glow leve */}
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>

          {/* SECONDARY */}
          <Link
            href="#services"
            className="group border-chi-cream/50 text-chi-cream hover:border-chi-cream relative inline-flex items-center justify-center overflow-hidden rounded-md border px-10 py-4 text-xs font-medium tracking-[0.22em] uppercase backdrop-blur-sm transition-all duration-300 hover:-translate-y-[2px]"
          >
            <span className="group-hover:text-chi-green-deep relative z-10 transition-colors duration-300">
              Descobrir
            </span>

            <span className="bg-chi-cream absolute inset-0 -translate-x-full transition-transform duration-500 ease-out group-hover:translate-x-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
