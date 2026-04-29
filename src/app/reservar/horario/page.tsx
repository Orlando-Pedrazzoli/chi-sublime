/**
 * Chi Sublime — Reservar (Step 2: Horario + Staff)
 * ============================================================
 *
 * Server Component. Busca staff ativos da DB e passa ao
 * Step2Client (orquestrador client-side).
 */

import type { Metadata } from 'next';
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

async function getActiveStaff(): Promise<StaffOption[]> {
  await connectDB();
  const staff = await Staff.find({ active: true }).sort({ order: 1 }).lean();
  return staff.map((s) => ({
    id: String(s._id),
    name: s.name,
    role: s.role.pt,
    photo: s.photo,
  }));
}

// ============================================================
// PAGE
// ============================================================

export default async function ReservarHorarioPage() {
  const staffOptions = await getActiveStaff();

  return (
    <>
      <PublicNavbar />

      <main className="bg-chi-cream min-h-screen pt-32 pb-20">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          {/* Hero curto */}
          <header className="mb-12 text-center">
            <span className="text-chi-gold-deep mb-4 block font-serif text-xs tracking-[0.32em] uppercase italic">
              — Reservar online —
            </span>
            <h1 className="text-chi-charcoal mb-5 font-serif text-4xl leading-[1.05] font-light tracking-tight md:text-5xl lg:text-6xl">
              Escolha o seu <span className="text-chi-green-deep italic">momento</span>.
            </h1>
            <p className="text-chi-charcoal-soft mx-auto max-w-xl text-base leading-[1.85] md:text-lg">
              Profissional, data e horário. Tudo no seu ritmo.
            </p>
          </header>

          {/* Stepper */}
          <div className="mb-14">
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
