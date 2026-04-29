/**
 * Chi Sublime — Reservar (Step 3: Confirmar)
 * ============================================================
 *
 * Server Component. Renderiza o form de confirmacao protegido pelo
 * BookingFlowGuard (exige Step 1 + Step 2 completados).
 */

import type { Metadata } from 'next';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingFlowGuard } from '@/components/booking/BookingFlowGuard';
import { BookingSummaryReadOnly } from '@/components/booking/BookingSummaryReadOnly';
import { Step3Client } from '@/components/booking/Step3Client';

export const metadata: Metadata = {
  title: 'Confirmar Reserva | Chi Sublime',
  description: 'Os seus dados para finalizar a reserva no Chi Sublime.',
};

export default function ReservarConfirmarPage() {
  return (
    <>
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-32 pb-20">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <header className="mb-12 text-center">
            <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
              — Reservar online —
            </span>
            <h1 className="text-chi-charcoal mb-5 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
              Os seus <span className="text-chi-green-deep italic">dados</span>.
            </h1>
            <p className="text-chi-charcoal-soft mx-auto max-w-xl text-base leading-[1.85] md:text-lg">
              Estamos quase a terminar.
            </p>
          </header>

          <div className="mb-14">
            <BookingStepper currentStep="confirm" />
          </div>

          <BookingFlowGuard requireStep="time">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
              <div>
                <Step3Client />
              </div>
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <BookingSummaryReadOnly />
              </aside>
            </div>
          </BookingFlowGuard>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
