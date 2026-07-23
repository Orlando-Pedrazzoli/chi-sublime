// 📄 src/components/home/Hero.tsx
/**
 * Chi Sublime — Hero
 * ============================================================
 *
 * Linguagem editorial: conteúdo ancorado em baixo à esquerda,
 * tipografia display gigante, uma única palavra em itálico
 * dourado — reservada exclusivamente a este momento.
 *
 * i18n: Server Component com getTranslations('home.hero').
 * O título usa t.rich() — as tags <em> e <br> vivem na
 * mensagem, permitindo que a palavra em itálico mude de
 * posição entre idiomas ("respira" / "breathes").
 *
 * OpenStatusBadge (client) acima do eyebrow: estado
 * aberto/fechado em tempo real, fuso Europe/Lisbon.
 *
 * ⚠️ Cores críticas em INLINE STYLE (regra do projeto:
 * Tailwind v4 + Next 16 falha a aplicar classes de cor em
 * alguns elementos — o link secundário renderizava escuro).
 * Border-radius de 8px nos CTAs, alinhado com o resto do site.
 *
 * Secundário = ghost button com borda + backdrop-blur, para
 * garantir leitura sobre qualquer zona da fotografia.
 */

import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { OpenStatusBadge } from '@/components/home/OpenStatusBadge';

export async function Hero() {
  const t = await getTranslations('home.hero');

  return (
    <section id="home" className="relative flex min-h-svh items-end overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="animate-ken-burns relative h-full w-full">
          <Image
            src="/images/hero.jpg"
            alt={t('imageAlt')}
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
          {/* Estado do salão em tempo real (fuso Europe/Lisbon) */}
          <div className="animate-fade-up animate-fade-up-delay-1">
            <OpenStatusBadge />
          </div>

          <p
            className="animate-fade-up animate-fade-up-delay-1 eyebrow mb-8"
            style={{ color: '#D4AF6E', textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
          >
            {t('eyebrow')}
          </p>

          <h1
            className="animate-fade-up animate-fade-up-delay-2 text-display-xl mb-8 font-serif text-balance"
            style={{ color: '#FAF7F2', textShadow: '0 4px 40px rgba(0,0,0,0.45)' }}
          >
            {t.rich('title', {
              em: (chunks) => (
                <em className="font-light italic" style={{ color: '#D4AF6E' }}>
                  {chunks}
                </em>
              ),
              br: () => <br />,
            })}
          </h1>

          <p
            className="animate-fade-up animate-fade-up-delay-3 mb-12 max-w-md text-base leading-[1.8] md:text-lg"
            style={{ color: 'rgba(250,247,242,0.9)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            {t('subtitle')}
          </p>

          <div className="animate-fade-up animate-fade-up-delay-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* PRIMARY — dourado, radius 8px */}
            <Link
              href="/reservar"
              className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
              style={{ color: '#1F3D2E', borderRadius: '8px' }}
            >
              {t('ctaPrimary')}
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
                borderRadius: '8px',
              }}
            >
              <span>{t('ctaSecondary')}</span>
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
