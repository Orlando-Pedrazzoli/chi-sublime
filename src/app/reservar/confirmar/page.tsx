// 📄 src/app/reservar/confirmar/page.tsx
/**
 * Chi Sublime — Reservar (Step 3: Confirmar)
 * ============================================================
 *
 * Server Component. Renderiza o form de confirmacao protegido
 * pelo BookingFlowGuard (exige Step 1 + Step 2 completados).
 *
 * Mobile-first: header compacto; no mobile o resumo read-only
 * aparece ANTES do formulário (o utilizador confirma o que vai
 * pagar antes de preencher dados — preço total visível cedo).
 */

import type { Metadata } from 'next';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { BookingFlowGuard } from '@/components/booking/BookingFlowGuard';
import { BookingSummaryReadOnly } from '@/components/booking/BookingSummaryReadOnly';
import { Step3Client } from '@/components/booking/Step3Client';

export const metadata: Metadata = {
  title: 'Confirmar Marcação | Chi Sublime',
  description: 'Os seus dados para finalizar a reserva no Chi Sublime.',
};

export default function ReservarConfirmarPage() {
  return (
    <>
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-24 pb-24 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-12">
          {/* Header compacto */}
          <header className="mb-6 md:mb-10">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-chi-charcoal font-serif text-2xl md:text-4xl">
                Confirmar reserva
              </h1>
              <span className="text-chi-charcoal-light hidden shrink-0 text-xs tracking-[0.15em] uppercase sm:block">
                Passo 3 de 3
              </span>
            </div>
            <p className="text-chi-charcoal-soft mt-2 hidden max-w-xl text-sm leading-[1.7] md:block">
              Só faltam os seus dados. Confirme o resumo e termine a reserva.
            </p>
          </header>

          {/* Stepper */}
          <div className="mb-8 md:mb-12">
            <BookingStepper currentStep="confirm" />
          </div>

          <BookingFlowGuard requireStep="time">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
              {/* Mobile: resumo primeiro (preço visível antes do form).
                  Desktop: form à esquerda, resumo sticky à direita. */}
              <aside className="order-first lg:sticky lg:top-24 lg:order-last lg:self-start">
                <BookingSummaryReadOnly />
              </aside>

              <div className="lg:order-first">
                <Step3Client />
              </div>
            </div>
          </BookingFlowGuard>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
