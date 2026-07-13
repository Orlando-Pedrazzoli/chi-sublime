// 📄 src/components/home/ContactPreview.tsx
/**
 * Chi Sublime — ContactPreview
 * ============================================================
 *
 * Fecho da homepage: bloco em verde profundo com o convite
 * final à reserva + informação prática em três colunas
 * (morada, contacto, horário).
 *
 * ⚠️ TODO (confirmar com o Jean Pierre antes do deploy):
 *   - Morada completa (rua e código postal)
 *   - Horário de funcionamento real
 *   - Link exato do Google Maps
 */

import Link from 'next/link';
import { Reveal } from '@/components/shared/Reveal';

const PHONE_DISPLAY = '+351 932 932 691';
const PHONE_TEL = 'tel:+351932932691';
const WHATSAPP = 'https://wa.me/351932932691';
const MAPS_URL = 'https://maps.google.com/?q=Chi+Sublime+Quinta+da+Bicuda+Cascais';

// TODO: confirmar horários reais com o cliente
const HOURS: Array<{ days: string; time: string }> = [
  { days: 'Terça a Sexta', time: '09:30 – 19:00' },
  { days: 'Sábado', time: '09:00 – 18:00' },
  { days: 'Domingo e Segunda', time: 'Encerrado' },
];

export function ContactPreview() {
  return (
    <section id="contact" className="bg-chi-green-deep text-chi-cream py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Convite */}
        <div className="mb-20 max-w-3xl md:mb-24">
          <Reveal>
            <span className="eyebrow text-chi-gold mb-8 block">Visite-nos</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-display-lg mb-10 font-serif text-balance">
              O seu momento começa com uma reserva
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex flex-wrap items-center gap-8">
              <Link
                href="/reservar"
                className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E' }}
              >
                Reservar online
              </Link>
              <Link
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-xs font-medium tracking-[0.22em] uppercase"
                style={{ color: '#FAF7F2' }}
              >
                <span className="border-chi-cream/40 group-hover:border-chi-gold border-b pb-1 transition-colors duration-300">
                  Falar por WhatsApp
                </span>
                <span className="text-chi-gold transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Informação prática — três colunas sobre régua */}
        <div className="border-chi-cream/15 grid grid-cols-1 gap-12 border-t pt-14 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal delay={0.05}>
            <h3 className="text-chi-gold mb-6 text-[11px] font-semibold tracking-[0.28em] uppercase">
              Morada
            </h3>
            <p className="text-chi-cream/80 text-base leading-[1.9]">
              Quinta da Bicuda
              <br />
              Cascais, Portugal
            </p>
            <Link
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-chi-cream/60 hover:text-chi-gold mt-5 inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase transition-colors duration-300"
            >
              Ver no mapa
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 className="text-chi-gold mb-6 text-[11px] font-semibold tracking-[0.28em] uppercase">
              Contacto
            </h3>
            <p className="text-chi-cream/80 text-base leading-[1.9]">
              <a href={PHONE_TEL} className="hover:text-chi-gold transition-colors duration-300">
                {PHONE_DISPLAY}
              </a>
              <br />
              <Link
                href="https://www.instagram.com/chiptsublime/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-chi-gold transition-colors duration-300"
              >
                @chiptsublime
              </Link>
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <h3 className="text-chi-gold mb-6 text-[11px] font-semibold tracking-[0.28em] uppercase">
              Horário
            </h3>
            <dl className="text-chi-cream/80 space-y-2 text-base leading-[1.7]">
              {HOURS.map((h) => (
                <div key={h.days} className="flex items-baseline justify-between gap-6">
                  <dt>{h.days}</dt>
                  <dd className="text-chi-cream/60 m-0 shrink-0 text-sm">{h.time}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
