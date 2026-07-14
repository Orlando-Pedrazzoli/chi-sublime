// 📄 src/app/admin/horarios/page.tsx
/**
 * Chi Sublime — Admin: Horários do Salão
 * ============================================================
 *
 * Substitui o placeholder. Três secções:
 *  1. Horário semanal (regular) — janela máxima de agendamento
 *  2. Feriados (holiday) — com recorrência anual
 *  3. Exceções (exception) — dia fechado ou horário especial
 *
 * Tudo o que é gravado aqui reflete IMEDIATAMENTE no site
 * público: calendário do cliente (dias opacos) e grelha de
 * horários, via schedule-resolver / month-availability.
 *
 * ⚠️ Se o requireAdmin estiver exportado no barrel '@/lib/auth'
 * em vez de '@/lib/auth/permissions', ajustar o import abaixo.
 */

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/permissions';
import { connectDB } from '@/lib/db/connect';
import { Schedule } from '@/lib/models';
import { toISODate } from '@/lib/utils/time-utils';
import { SalonHoursEditor, type SalonDayDTO } from '@/components/admin/schedule/SalonHoursEditor';
import { HolidaysManager, type HolidayDTO } from '@/components/admin/schedule/HolidaysManager';
import {
  ExceptionsManager,
  type ExceptionDTO,
} from '@/components/admin/schedule/ExceptionsManager';

export const metadata: Metadata = {
  title: 'Horários | Admin',
};

export const dynamic = 'force-dynamic';

// ============================================================
// DATA FETCHING
// ============================================================

async function getScheduleData(): Promise<{
  week: SalonDayDTO[];
  holidays: HolidayDTO[];
  exceptions: ExceptionDTO[];
}> {
  await connectDB();

  const docs = await Schedule.find({}).lean();

  const week: SalonDayDTO[] = docs
    .filter((d) => d.type === 'regular' && d.dayOfWeek !== undefined && d.dayOfWeek !== null)
    .map((d) => ({
      dayOfWeek: d.dayOfWeek!,
      open: d.open,
      start: d.start ?? '10:00',
      end: d.end ?? '19:00',
      breaks: (d.breaks ?? []).map((b) => ({ start: b.start, end: b.end })),
    }));

  const holidays: HolidayDTO[] = docs
    .filter((d) => d.type === 'holiday' && d.date)
    .map((d) => ({
      id: String(d._id),
      date: toISODate(new Date(d.date!)),
      reason: d.reason,
      recurringYearly: Boolean(d.recurringYearly),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const exceptions: ExceptionDTO[] = docs
    .filter((d) => d.type === 'exception' && d.date)
    .map((d) => ({
      id: String(d._id),
      date: toISODate(new Date(d.date!)),
      open: d.open,
      start: d.start,
      end: d.end,
      reason: d.reason,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { week, holidays, exceptions };
}

// ============================================================
// PAGE
// ============================================================

export default async function AdminHorariosPage() {
  await requireAdmin();
  const { week, holidays, exceptions } = await getScheduleData();

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <h1 className="text-chi-charcoal font-serif text-2xl md:text-3xl">Horários do salão</h1>
        <p className="text-chi-charcoal-soft mt-2 max-w-2xl text-sm leading-relaxed">
          O que definir aqui reflete imediatamente no site de reservas: dias encerrados ficam opacos
          no calendário do cliente e sem horários disponíveis. A disponibilidade de cada
          profissional é sempre a interseção deste horário com o horário individual dele (gerido em
          Equipa).
        </p>
      </header>

      {/* 1 — Horário semanal */}
      <section>
        <div className="mb-4">
          <h2 className="text-chi-charcoal font-serif text-lg">Horário semanal</h2>
          <p className="text-chi-charcoal-soft mt-1 text-sm">
            Dias e horas de funcionamento regulares do salão.
          </p>
        </div>
        <SalonHoursEditor initial={week} />
      </section>

      {/* 2 — Feriados */}
      <section>
        <div className="mb-4">
          <h2 className="text-chi-charcoal font-serif text-lg">Feriados</h2>
          <p className="text-chi-charcoal-soft mt-1 text-sm">
            O salão encerra nestes dias. Com &quot;Todos os anos&quot;, o feriado repete-se
            automaticamente (ex: 25 de dezembro).
          </p>
        </div>
        <HolidaysManager initial={holidays} />
      </section>

      {/* 3 — Exceções */}
      <section>
        <div className="mb-4">
          <h2 className="text-chi-charcoal font-serif text-lg">Exceções</h2>
          <p className="text-chi-charcoal-soft mt-1 text-sm">
            Dias pontuais fora do padrão: encerramento (obras, evento) ou horário especial (véspera
            de festa até às 14h). A exceção tem prioridade sobre o horário semanal e os feriados.
          </p>
        </div>
        <ExceptionsManager initial={exceptions} />
      </section>
    </div>
  );
}
