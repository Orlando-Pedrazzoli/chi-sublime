import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Users, Scissors, ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, Service } from '@/lib/models';
import { LogoutButton } from '@/components/auth/LogoutButton';

export const metadata: Metadata = {
  title: 'Dashboard · Chi Sublime Admin',
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
    <main
      className="min-h-screen px-6 py-10 md:px-12 md:py-14"
      style={{ backgroundColor: '#FAF7F2' }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header
          className="mb-10 flex flex-col gap-4 border-b pb-8 md:flex-row md:items-end md:justify-between"
          style={{ borderColor: 'rgba(31,61,46,0.1)' }}
        >
          <div>
            <p className="mb-2 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#B8924A' }}>
              Painel Administrativo
            </p>
            <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1A1A' }}>
              {greeting}, <span style={{ color: '#1F3D2E' }}>{firstName}</span>.
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#5A5A5A' }}>
              {formatLongDate(now)}
            </p>
          </div>

          <LogoutButton variant="inline" label="Sair" />
        </header>

        {/* Banner Sprint 5 */}
        <div
          className="mb-8 rounded-md border-l-4 px-5 py-4 text-sm"
          style={{
            backgroundColor: 'rgba(212,175,110,0.1)',
            borderColor: '#D4AF6E',
            color: '#5A5A5A',
          }}
        >
          <strong style={{ color: '#1F3D2E' }}>Em construção.</strong> O dashboard completo (KPIs em
          tempo real, agenda, gráficos, performance da equipa) faz parte do Sprint 5. Por agora,
          este é o ponto de entrada que confirma que o login funciona.
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
          <h2 className="mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
            Acessos rápidos
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLink href="/admin/reservas" label="Reservas" />
            <QuickLink href="/admin/clientes" label="Clientes" />
            <QuickLink href="/admin/receitas" label="Receitas / Caixa" />
            <QuickLink href="/admin/despesas" label="Despesas" />
            <QuickLink href="/admin/servicos" label="Serviços" />
            <QuickLink href="/admin/relatorios/financeiro" label="Relatórios" />
          </div>
          <p className="mt-4 text-xs" style={{ color: '#5A5A5A' }}>
            Estas páginas serão implementadas nos próximos sprints. Por agora, os links redirecionam
            para placeholders ou para o dashboard.
          </p>
        </section>
      </div>
    </main>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
