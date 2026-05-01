import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Users, Scissors, ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, Service } from '@/lib/models';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

async function getDashboardStats() {
  await connectDB();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [bookingsToday, totalClients, totalServices, totalBookings] = await Promise.all([
    Booking.countDocuments({
      startTime: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ['cancelled', 'no-show'] },
    }),
    Client.countDocuments({ active: true }),
    Service.countDocuments({ active: true }),
    Booking.countDocuments({}),
  ]);

  return { bookingsToday, totalClients, totalServices, totalBookings };
}

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const stats = await getDashboardStats();

  const firstName = user.name.split(/\s+/)[0];
  const now = new Date();
  const greeting = getGreeting(now.getHours());

  return (
    <div className="mx-auto max-w-6xl">
      {/* Welcome banner */}
      <section
        className="mb-8 overflow-hidden rounded-lg p-6 sm:p-8"
        style={{
          backgroundColor: '#1F3D2E',
          backgroundImage:
            'radial-gradient(circle at top right, rgba(212,175,110,0.15) 0%, transparent 50%)',
        }}
      >
        <p className="mb-2 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#D4AF6E' }}>
          {formatToday()}
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl" style={{ color: '#FAF7F2' }}>
          {greeting}, <span style={{ color: '#D4AF6E' }}>{firstName}</span>.
        </h2>
        <p className="mt-3 max-w-md text-sm" style={{ color: 'rgba(250,247,242,0.7)' }}>
          Tens {stats.bookingsToday} {stats.bookingsToday === 1 ? 'reserva' : 'reservas'} agendadas
          para hoje. Bom trabalho.
        </p>
      </section>

      {/* Banner Sprint 5 */}
      <div
        className="mb-8 rounded-md border-l-4 px-5 py-4 text-sm"
        style={{
          backgroundColor: 'rgba(212,175,110,0.1)',
          borderColor: '#D4AF6E',
          color: '#5A5A5A',
        }}
      >
        <strong style={{ color: '#1F3D2E' }}>Em construção.</strong> A agenda completa, gráficos de
        receita e performance da equipa estão a ser implementados nos próximos blocos.
      </div>

      {/* KPI cards */}
      <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Reservas hoje"
          value={stats.bookingsToday.toString()}
          icon={<Calendar size={20} />}
        />
        <KpiCard
          label="Reservas (total)"
          value={stats.totalBookings.toString()}
          icon={<Calendar size={20} />}
        />
        <KpiCard
          label="Clientes activos"
          value={stats.totalClients.toString()}
          icon={<Users size={20} />}
        />
        <KpiCard
          label="Serviços no catálogo"
          value={stats.totalServices.toString()}
          icon={<Scissors size={20} />}
        />
      </section>

      {/* Quick links */}
      <section>
        <h3 className="mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          Acessos rápidos
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/admin/reservas" label="Ver agenda do dia" />
          <QuickLink href="/admin/clientes" label="Gerir clientes" />
          <QuickLink href="/admin/receitas" label="Registar receita" />
          <QuickLink href="/admin/despesas" label="Registar despesa" />
          <QuickLink href="/admin/servicos" label="Gerir serviços" />
          <QuickLink href="/admin/relatorios/financeiro" label="Ver relatórios" />
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-5 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.08)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          {label}
        </span>
        <span style={{ color: '#D4AF6E' }}>{icon}</span>
      </div>
      <p className="font-serif text-3xl" style={{ color: '#1F3D2E' }}>
        {value}
      </p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md border px-5 py-4 transition-all hover:-translate-y-[1px] hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(31,61,46,0.1)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
        {label}
      </span>
      <ArrowRight
        size={16}
        className="transition-transform group-hover:translate-x-1"
        style={{ color: '#D4AF6E' }}
      />
    </Link>
  );
}

// ============================================================
// Helpers
// ============================================================

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}

function formatToday(): string {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
