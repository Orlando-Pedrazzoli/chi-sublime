// 📄 src/components/home/ContactPreview.tsx
/**
 * Chi Sublime — ContactPreview
 * ============================================================
 *
 * Fecho da homepage: bloco em verde profundo com o convite
 * final à reserva + informação prática em três colunas
 * (morada, contacto, horário).
 *
 * i18n: getTranslations('home.contact'). NOMES dos dias nos JSONs
 * (texto, traduzível); HORAS e agrupamento vêm de SALON_HOURS
 * (dados — fonte de verdade em constants/business.ts).
 *
 * ✅ Horário confirmado (Jean Pierre, jul/2026):
 *    Terça a Sábado 09:00–18:00 · Segunda e Domingo encerrado
 *
 * O bloco é gerado por groupSalonHours(): dias consecutivos com o
 * mesmo horário colapsam numa linha e os dias fechados juntam-se
 * numa única linha "Encerrado". Mudar o horário na constante
 * reescreve este bloco sozinho.
 */

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/shared/Reveal';
import { groupSalonHours, type WeekDayIndex } from '@/lib/constants/business';

const PHONE_DISPLAY = '+351 932 932 691';
const PHONE_TEL = 'tel:+351932932691';
const WHATSAPP = 'https://wa.me/351932932691';
const MAPS_URL = 'https://maps.google.com/?q=38.709560,-9.446915';

/** WeekDayIndex → chave de tradução em home.contact.hours.days.* */
const DAY_KEYS: Record<WeekDayIndex, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

export async function ContactPreview() {
  const t = await getTranslations('home.contact');

  const groups = groupSalonHours();
  const dayName = (d: WeekDayIndex) => t(`hours.days.${DAY_KEYS[d]}`);

  /** [Ter, Qua, Qui, Sex, Sáb] → "Terça a Sábado"; [Seg, Dom] → "Segunda e Domingo" */
  const joinDays = (days: WeekDayIndex[], consecutive: boolean) => {
    if (days.length === 1) return dayName(days[0]);
    const from = dayName(days[0]);
    const to = dayName(days[days.length - 1]);
    if (consecutive && days.length > 2) return t('hours.range', { from, to });
    return t('hours.and', { from, to });
  };

  // Dias abertos: uma linha por bloco de horário
  const openRows = groups
    .filter((g) => g.open)
    .map((g) => ({
      key: `open-${g.days.join('-')}`,
      label: joinDays(g.days, true),
      value: `${g.start} – ${g.end}`,
    }));

  // Dias fechados: colapsados numa única linha
  const closedDays = groups.filter((g) => !g.open).flatMap((g) => g.days);
  const closedRow =
    closedDays.length > 0
      ? {
          key: 'closed',
          label: joinDays(closedDays, false),
          value: t('hours.closed'),
        }
      : null;

  const hourRows = [...openRows, ...(closedRow ? [closedRow] : [])];

  return (
    <section id="contact" className="bg-chi-green-deep text-chi-cream py-28 md:py-40">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        {/* Convite */}
        <div className="mb-20 max-w-3xl md:mb-24">
          <Reveal>
            <span className="eyebrow text-chi-gold mb-8 block">{t('eyebrow')}</span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-display-lg mb-10 font-serif text-balance">{t('title')}</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex flex-wrap items-center gap-8">
              <Link
                href="/reservar"
                className="bg-chi-gold hover:bg-chi-gold-soft inline-flex items-center justify-center px-10 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-300"
                style={{ color: '#1F3D2E' }}
              >
                {t('ctaBook')}
              </Link>
              <Link
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-xs font-medium tracking-[0.22em] uppercase"
                style={{ color: '#FAF7F2' }}
              >
                <span className="border-chi-cream/40 group-hover:border-chi-gold border-b pb-1 transition-colors duration-300">
                  {t('ctaWhatsapp')}
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
              {t('addressTitle')}
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
              {t('viewMap')}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>

          <Reveal delay={0.1}>
            <h3 className="text-chi-gold mb-6 text-[11px] font-semibold tracking-[0.28em] uppercase">
              {t('contactTitle')}
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
              {t('hoursTitle')}
            </h3>
            <dl className="text-chi-cream/80 space-y-2 text-base leading-[1.7]">
              {hourRows.map((row) => (
                <div key={row.key} className="flex items-baseline justify-between gap-6">
                  <dt>{row.label}</dt>
                  <dd className="text-chi-cream/60 m-0 shrink-0 text-sm">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
