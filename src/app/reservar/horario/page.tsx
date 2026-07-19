// 📄 src/app/reservar/horario/page.tsx
/**
 * Chi Sublime — Reservar (Step 2: Horario + Staff)
 * ============================================================
 *
 * Server Component. Busca staff ativos da DB e passa ao
 * Step2Client (orquestrador client-side).
 *
 * Mobile-first: header compacto — o profissional e o
 * calendário são a primeira coisa visível no telemóvel.
 */

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { localizedField } from '@/lib/utils/localized';
import { connectDB } from '@/lib/db/connect';
import { Staff } from '@/lib/models';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingFlowGuard } from '@/components/booking/BookingFlowGuard';
import { Step2Client } from '@/components/booking/Step2Client';
import type { StaffOption } from '@/components/booking/StaffPicker';

export const metadata: Metadata = {
  title: 'Escolher horário | Chi Sublime',
  description: 'Escolha a data e o profissional para a sua reserva no Chi Sublime.',
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

// ============================================================
// PAGE
// ============================================================

export default async function ReservarHorarioPage() {
  const locale = (await getLocale()) as Locale;
  const [t, staffOptions] = await Promise.all([
    getTranslations('booking.pages'),
    getActiveStaff(locale),
  ]);

  return (
    <>
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-24 pb-36 md:pt-32 md:pb-20">
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

          {/* Stepper */}
          <div className="mb-8 md:mb-12">
            <BookingStepper currentStep="time" />
          </div>

          {/* Conteudo protegido — exige Step 1 completado */}
          <BookingFlowGuard requireStep="time">
            <Step2Client staffOptions={staffOptions} />
          </BookingFlowGuard>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
