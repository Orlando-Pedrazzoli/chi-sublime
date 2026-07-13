// 📄 src/components/home/Hero.tsx
/**
 * Chi Sublime — Hero
 * ============================================================
 *
 * Linguagem editorial: conteúdo ancorado em baixo à esquerda,
 * tipografia display gigante, uma única palavra em itálico
 * dourado — reservada exclusivamente a este momento.
 *
 * ⚠️ Cores críticas em INLINE STYLE (regra do projeto:
 * Tailwind v4 + Next 16 falha a aplicar classes de cor em
 * alguns elementos — o link secundário renderizava escuro).
 *
 * Secundário = ghost button com borda + backdrop-blur, para
 * garantir leitura sobre qualquer zona da fotografia.
 */

import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section id="home" className="relative flex min-h-svh items-end overflow-hidden">
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

      {/* Overlay — mais escuro em baixo, onde vive o texto */}
      <div className="from-chi-green-darker/25 via-chi-green-darker/30 to-chi-green-darker/90 absolute inset-0 z-10 bg-gradient-to-b" />

      {/* Conteúdo — bottom-left */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pt-40 pb-16 md:px-12 md:pb-24">
        <div className="max-w-4xl">
          <p
            className="animate-fade-up animate-fade-up-delay-1 eyebrow mb-8"
            style={{ color: '#D4AF6E', textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
          >
            Hair Style &amp; Beauty · Cascais
          </p>

          <h1
            className="animate-fade-up animate-fade-up-delay-2 text-display-xl mb-8 font-serif text-balance"
            style={{ color: '#FAF7F2', textShadow: '0 4px 40px rgba(0,0,0,0.45)' }}
          >
            Beleza que{' '}
            <em className="font-light italic" style={{ color: '#D4AF6E' }}>
              respira
            </em>
            <br />o tempo
          </h1>

          <p
            className="animate-fade-up animate-fade-up-delay-3 mb-12 max-w-md text-base leading-[1.8] md:text-lg"
            style={{ color: 'rgba(250,247,242,0.9)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            Um espaço de cuidado refinado na Quinta da Bicuda, onde cada gesto é pensado para
            revelar a sua essência.
          </p>

          <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* PRIMARY — dourado, cantos retos */}
            <Link
              href="/reservar"
              className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
              style={{ color: '#1F3D2E' }}
            >
              Reservar
            </Link>

            {/* SECONDARY — ghost com borda + blur, cores FIXAS em
                inline style. O hover NÃO troca cores (texto fica
                branco sempre); apenas a seta desliza. */}
            <Link
              href="#services"
              className="group inline-flex items-center justify-center gap-3 border px-10 py-4 text-xs font-medium tracking-[0.22em] uppercase backdrop-blur-sm"
              style={{
                color: '#FAF7F2',
                borderColor: 'rgba(250,247,242,0.65)',
                backgroundColor: 'rgba(20,40,32,0.25)',
              }}
            >
              <span>Descobrir os serviços</span>
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: '#D4AF6E' }}
                aria-hidden
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
