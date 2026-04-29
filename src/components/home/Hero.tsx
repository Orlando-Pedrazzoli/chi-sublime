import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Imagem de fundo com Ken Burns */}
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

      {/* Overlay verde escuro */}
      <div className="from-chi-green-darker/40 via-chi-green-darker/55 to-chi-green-darker/85 absolute inset-0 z-10 bg-gradient-to-b" />

      {/* Conteúdo */}
      <div className="text-chi-cream relative z-20 mx-auto max-w-3xl px-6 text-center">
        <p
          className="animate-fade-up animate-fade-up-delay-1 text-chi-gold mb-6 font-serif text-sm tracking-[0.3em] uppercase italic"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
        >
          — Hair Style & Beauty · Cascais —
        </p>

        <h1
          className="animate-fade-up animate-fade-up-delay-2 mb-6 font-serif text-5xl leading-[1.05] font-light tracking-tight md:text-7xl lg:text-8xl"
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

        <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/reservar" className="bg-chi-gold ...">
            Reservar Online
          </Link>
          <Link
            href="#services"
            className="group border-chi-cream relative overflow-hidden border px-10 py-4 text-xs font-medium tracking-[0.22em] uppercase transition-all"
            style={{ color: '#FAF7F2' }}
          >
            <span className="group-hover:text-chi-green-deep relative z-10 transition-colors duration-300">
              Descobrir
            </span>
            <span className="bg-chi-cream absolute inset-0 -translate-x-full transition-transform duration-300 group-hover:translate-x-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
