// 📄 src/app/marcacoes/horario/page.tsx
/**
 * Chi Sublime — Marcar (Step 2: Horario + Staff)
 * ============================================================
 *
 * Server Component. Busca staff ativos da DB e passa ao
 * Step2Client (orquestrador client-side).
 *
 * Mobile-first: header compacto — o profissional e o
 * calendário são a primeira coisa visível no telemóvel.
 *
 * MOBILE TIPO APP (< 1024px): <BookingTopBar /> no topo (voltar ·
 * passo · sair) em vez da navbar pública/stepper; a barra de ação
 * fixa no fundo é rendida pelo Step2Client. Sem rodapé em mobile.
 */

import type { Metadata, Viewport } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { connectDB } from '@/lib/db/connect';
import { Service, Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingTopBar } from '@/components/booking/BookingTopBar';
import { BookingFlowGuard } from '@/components/booking/BookingFlowGuard';
import { Step2Client } from '@/components/booking/Step2Client';
import type { StaffOption } from '@/components/booking/StaffPicker';

export const metadata: Metadata = {
  title: 'Escolher horário | Chi Sublime',
  description: 'Escolha a data e o profissional para a sua marcação no Chi Sublime.',
};

/**
 * viewport-fit=cover (junta-se ao viewport do layout raiz): ativa os
 * `env(safe-area-inset-*)` para a barra de ação fixa do funil mobile
 * não ficar por baixo da barra de gesto do iPhone.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
};

// ============================================================
// DATA FETCHING
// ============================================================

async function getActiveStaff(locale: Locale): Promise<StaffOption[]> {
  await connectDB();
  const staff = await Staff.find({ active: true }).sort({ order: 1 }).lean();
  return staff.map((s) => ({
    id: String(s._id),
    name: s.name,
    role: localizedField(s.role, locale),
    photo: s.photo,
  }));
}

/**
 * Mapa serviço → profissionais que o fazem (vazio = qualquer um),
 * para TODOS os serviços ativos. O carrinho vive no sessionStorage
 * (o servidor não o conhece), por isso o Step2Client cruza este mapa
 * com os serviços escolhidos no browser — sem round-trip extra.
 */
async function getServiceEligibility(): Promise<Record<string, string[]>> {
  await connectDB();
  const services = await Service.find({ active: true }).select('staffIds').lean();
  const map: Record<string, string[]> = {};
  for (const s of services) {
    map[String(s._id)] = (s.staffIds ?? []).map(String);
  }
  return map;
}

// ============================================================
// PAGE
// ============================================================

export default async function MarcacoesHorarioPage() {
  const locale = (await getLocale()) as Locale;
  const [t, staffOptions, serviceEligibility] = await Promise.all([
    getTranslations('booking.pages'),
    getActiveStaff(locale),
    getServiceEligibility(),
  ]);

  return (
    <div className="bk-shell">
      {/* Desktop: navbar pública · Mobile: barra de topo tipo app */}
      <div className="bk-desktop-only">
        <PublicNavbar />
      </div>
      <BookingTopBar step="time" />

      <main className="bk-main">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
          {/* Header compacto */}
          <header className="mb-6 md:mb-10">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-chi-charcoal font-serif text-2xl md:text-4xl">
                {t('step2Title')}
              </h1>
              <span className="text-chi-charcoal-light hidden shrink-0 text-xs tracking-[0.15em] uppercase sm:block">
                {t('stepLabel', { current: 2, total: 3 })}
              </span>
            </div>
            <p className="text-chi-charcoal-soft mt-2 hidden max-w-xl text-sm leading-[1.7] md:block">
              {t('step2Intro')}
            </p>
          </header>

          {/* Stepper — só desktop (em mobile o progresso está na barra de topo) */}
          <div className="bk-desktop-only mb-8 md:mb-12">
            <BookingStepper currentStep="time" />
          </div>

          {/* Conteudo protegido — exige Step 1 completado */}
          <BookingFlowGuard requireStep="time">
            <Step2Client staffOptions={staffOptions} serviceEligibility={serviceEligibility} />
          </BookingFlowGuard>
        </div>
      </main>

      {/* Rodapé só em desktop — em mobile o ecrã termina na barra de ação */}
      <div className="bk-desktop-only">
        <PublicFooter />
      </div>
    </div>
  );
}
