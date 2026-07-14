// 📄 src/app/admin/dashboard/page.tsx
/**
 * Chi Sublime — Admin: Dashboard
 * ============================================================
 *
 * O ritual diário do Jean, mobile-first. Três zonas por ordem
 * de prioridade no scroll (best practices Zenoti/SalonIQ/Meevo:
 * dashboard diário conciso, poucos KPIs, cada card leva à ação):
 *
 *  1. HOJE — próxima cliente, contadores do dia, agenda compacta,
 *     ações rápidas. Substitui o "toque no bolso" do Noona em
 *     conjunto com o email de nova reserva.
 *  2. ATENÇÃO — novas reservas online (24h) e cancelamentos (48h).
 *  3. NEGÓCIO — receita da semana vs anterior, ocupação por
 *     profissional (benchmark saudável 80-85%), top serviços,
 *     novas clientes e % reservas online no mês.
 *
 * Auto-refresh a cada 2 min via <DashboardAutoRefresh />.
 * Nota: ocupação = minutos reservados ÷ janela salão ∩ staff
 * (sem descontar breaks — aproximação documentada).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Clock,
  Euro,
  Globe,
  ShoppingBag,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';
import { connectDB } from '@/lib/db/connect';
import { Booking, Client, Schedule, Staff, Transaction, type ISchedule } from '@/lib/models';
import { getWeekDay, timeToMinutes } from '@/lib/utils/time-utils';
import { DashboardAutoRefresh } from '@/components/admin/dashboard/AutoRefresh';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// ============================================================
// DATA
// ============================================================

type TodayBooking = {
  id: string;
  time: string;
  clientName: string;
  services: string;
  staffName: string;
  status: string;
};

type AttentionItem = {
  id: string;
  title: string;
  subtitle: string;
  when: string;
};

type StaffOccupancy = { name: string; percent: number };

async function getDashboardData() {
  await connectDB();

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Semana atual (Segunda 00:00) e semana anterior
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const timeFmt = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayTimeFmt = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const [
    todayBookingsRaw,
    revenueTodayAgg,
    revenueWeekAgg,
    revenuePrevWeekAgg,
    cancelledToday,
    noShowToday,
    recentOnlineRaw,
    recentCancellationsRaw,
    newClientsMonth,
    monthSourceAgg,
    topServicesAgg,
    activeStaff,
    regularSchedules,
    weekBookingsAgg,
  ] = await Promise.all([
    Booking.find({
      startTime: { $gte: todayStart, $lt: todayEnd },
      status: { $nin: ['cancelled'] },
    })
      .sort({ startTime: 1 })
      .populate('clientId', 'name')
      .populate('staffId', 'name')
      .lean(),

    Transaction.aggregate([
      {
        $match: {
          type: 'income',
          status: 'completed',
          date: { $gte: todayStart, $lt: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalWithVat' } } },
    ]),

    Transaction.aggregate([
      { $match: { type: 'income', status: 'completed', date: { $gte: weekStart, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$totalWithVat' } } },
    ]),

    Transaction.aggregate([
      {
        $match: {
          type: 'income',
          status: 'completed',
          date: { $gte: prevWeekStart, $lt: weekStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalWithVat' } } },
    ]),

    Booking.countDocuments({ cancelledAt: { $gte: todayStart, $lt: todayEnd } }),

    Booking.countDocuments({
      status: 'no-show',
      startTime: { $gte: todayStart, $lt: todayEnd },
    }),

    Booking.find({ source: 'website', createdAt: { $gte: h24Ago } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientId', 'name')
      .lean(),

    Booking.find({ status: 'cancelled', cancelledAt: { $gte: h48Ago } })
      .sort({ cancelledAt: -1 })
      .limit(5)
      .populate('clientId', 'name')
      .lean(),

    Client.countDocuments({ active: true, createdAt: { $gte: monthStart } }),

    Booking.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),

    Booking.aggregate([
      {
        $match: {
          startTime: { $gte: weekStart, $lte: now },
          status: { $nin: ['cancelled', 'no-show'] },
        },
      },
      { $unwind: '$services' },
      { $group: { _id: '$services.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    Staff.find({ active: true }).lean(),

    Schedule.find({ type: 'regular' }).lean(),

    Booking.aggregate([
      {
        $match: {
          startTime: { $gte: weekStart, $lt: todayEnd },
          status: { $in: ['pending', 'confirmed', 'in-progress', 'completed'] },
        },
      },
      { $group: { _id: '$staffId', minutes: { $sum: '$totalDuration' } } },
    ]),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const clientName = (b: any) => (b.clientId as any)?.name ?? b.guestInfo?.name ?? 'Cliente';

  const todayBookings: TodayBooking[] = todayBookingsRaw.map((b: any) => ({
    id: String(b._id),
    time: timeFmt.format(new Date(b.startTime)),
    clientName: clientName(b),
    services: b.services.map((s: any) => s.name).join(', '),
    staffName: (b.staffId as any)?.name ?? '—',
    status: b.status,
  }));

  const nextBooking =
    todayBookingsRaw
      .filter(
        (b: any) => new Date(b.startTime) > now && ['pending', 'confirmed'].includes(b.status),
      )
      .map((b: any) => ({
        time: timeFmt.format(new Date(b.startTime)),
        clientName: clientName(b),
        services: b.services.map((s: any) => s.name).join(', '),
        staffName: (b.staffId as any)?.name ?? '—',
      }))[0] ?? null;

  const recentOnline: AttentionItem[] = recentOnlineRaw.map((b: any) => ({
    id: String(b._id),
    title: clientName(b),
    subtitle: b.services.map((s: any) => s.name).join(', '),
    when: dayTimeFmt.format(new Date(b.startTime)),
  }));

  const recentCancellations: AttentionItem[] = recentCancellationsRaw.map((b: any) => ({
    id: String(b._id),
    title: clientName(b),
    subtitle: b.cancellationReason ?? 'Sem motivo indicado',
    when: dayTimeFmt.format(new Date(b.startTime)),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Ocupação por staff (semana até hoje): reservado ÷ janela salão ∩ staff
  const regularByWeekday = new Map<number, ISchedule>();
  for (const s of regularSchedules) {
    if (s.dayOfWeek !== undefined && s.dayOfWeek !== null) regularByWeekday.set(s.dayOfWeek, s);
  }
  const bookedByStaff = new Map<string, number>(
    weekBookingsAgg.map((r: { _id: unknown; minutes: number }) => [String(r._id), r.minutes]),
  );

  const occupancy: StaffOccupancy[] = activeStaff.map((staff) => {
    let available = 0;
    for (let d = new Date(weekStart); d <= todayStart; d.setDate(d.getDate() + 1)) {
      const regular = regularByWeekday.get(d.getDay());
      if (!regular?.open || !regular.start || !regular.end) continue;
      const cfg = staff.workingHours?.[getWeekDay(d)];
      if (!cfg?.enabled) continue;
      const start = Math.max(timeToMinutes(regular.start), timeToMinutes(cfg.start));
      const end = Math.min(timeToMinutes(regular.end), timeToMinutes(cfg.end));
      if (end > start) available += end - start;
    }
    const booked = bookedByStaff.get(String(staff._id)) ?? 0;
    return {
      name: staff.name,
      percent: available > 0 ? Math.min(100, Math.round((booked / available) * 100)) : 0,
    };
  });

  const totalMonthBookings = monthSourceAgg.reduce(
    (s: number, r: { count: number }) => s + r.count,
    0,
  );
  const onlineMonthBookings =
    monthSourceAgg.find((r: { _id: string }) => r._id === 'website')?.count ?? 0;

  return {
    todayBookings,
    nextBooking,
    revenueToday: revenueTodayAgg[0]?.total ?? 0,
    revenueWeek: revenueWeekAgg[0]?.total ?? 0,
    revenuePrevWeek: revenuePrevWeekAgg[0]?.total ?? 0,
    cancelledToday: cancelledToday + noShowToday,
    recentOnline,
    recentCancellations,
    newClientsMonth,
    onlineShare:
      totalMonthBookings > 0 ? Math.round((onlineMonthBookings / totalMonthBookings) * 100) : 0,
    topServices: topServicesAgg as Array<{ _id: string; count: number }>,
    occupancy,
  };
}

// ============================================================
// PAGE
// ============================================================

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const data = await getDashboardData();

  const firstName = user.name.split(/\s+/)[0];
  const greeting = getGreeting(new Date().getHours());
  const weekDelta =
    data.revenuePrevWeek > 0
      ? Math.round(((data.revenueWeek - data.revenuePrevWeek) / data.revenuePrevWeek) * 100)
      : null;

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <DashboardAutoRefresh seconds={120} />

      {/* ============ ZONA 1 — HOJE ============ */}

      {/* Saudação compacta */}
      <p className="mb-6 text-sm" style={{ color: '#5A5A5A' }}>
        {greeting}, <strong style={{ color: '#1F3D2E' }}>{firstName}</strong> ·{' '}
        {data.todayBookings.length} {data.todayBookings.length === 1 ? 'reserva' : 'reservas'} hoje
      </p>

      {/* Próxima cliente */}
      {data.nextBooking ? (
        <Link
          href="/admin/reservas"
          className="mb-4 block rounded-lg border p-5 transition-shadow hover:shadow-md"
          style={{
            backgroundColor: '#1F3D2E',
            borderColor: 'rgba(212,175,110,0.4)',
            backgroundImage:
              'radial-gradient(circle at top right, rgba(212,175,110,0.15) 0%, transparent 50%)',
          }}
        >
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: '#D4AF6E' }}>
            A seguir
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-serif text-2xl" style={{ color: '#FAF7F2' }}>
                {data.nextBooking.clientName}
              </p>
              <p className="mt-1 truncate text-sm" style={{ color: 'rgba(250,247,242,0.7)' }}>
                {data.nextBooking.services} · {data.nextBooking.staffName}
              </p>
            </div>
            <span className="shrink-0 font-serif text-3xl" style={{ color: '#D4AF6E' }}>
              {data.nextBooking.time}
            </span>
          </div>
        </Link>
      ) : (
        <div
          className="mb-4 rounded-lg border border-dashed p-5 text-sm"
          style={{ borderColor: 'rgba(31,61,46,0.2)', color: '#5A5A5A' }}
        >
          Sem mais clientes agendadas para hoje.
        </div>
      )}

      {/* KPIs do dia */}
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Reservas hoje"
          value={String(data.todayBookings.length)}
          icon={<Calendar size={18} />}
          href="/admin/reservas"
        />
        <KpiCard
          label="Receita hoje"
          value={euros(data.revenueToday)}
          icon={<Euro size={18} />}
          href="/admin/receitas"
        />
        <KpiCard
          label="Cancel. / faltas hoje"
          value={String(data.cancelledToday)}
          icon={<XCircle size={18} />}
          href="/admin/reservas"
          alert={data.cancelledToday > 0}
        />
        <KpiCard
          label="Online (24h)"
          value={String(data.recentOnline.length)}
          icon={<Globe size={18} />}
          href="/admin/reservas"
        />
      </section>

      {/* Ações rápidas */}
      <section className="mb-8 grid grid-cols-3 gap-3">
        <QuickAction
          href="/admin/reservas?new=1"
          icon={<CalendarPlus size={16} />}
          label="Nova reserva"
          primary
        />
        <QuickAction href="/admin/receitas" icon={<ShoppingBag size={16} />} label="POS" />
        <QuickAction href="/admin/caixa" icon={<Wallet size={16} />} label="Caixa" />
      </section>

      {/* Agenda compacta de hoje */}
      <Panel title="Agenda de hoje" href="/admin/reservas" linkLabel="Ver agenda">
        {data.todayBookings.length === 0 ? (
          <EmptyRow text="Sem reservas para hoje." />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'rgba(31,61,46,0.06)' }}>
            {data.todayBookings.slice(0, 8).map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-3">
                <span
                  className="w-12 shrink-0 font-mono text-sm font-medium"
                  style={{ color: '#1F3D2E' }}
                >
                  {b.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: '#1A1A1A' }}>
                    {b.clientName}
                  </p>
                  <p className="truncate text-xs" style={{ color: '#5A5A5A' }}>
                    {b.services}
                  </p>
                </div>
                <span
                  className="hidden shrink-0 text-[10px] tracking-[0.15em] uppercase sm:block"
                  style={{ color: '#B8924A' }}
                >
                  {b.staffName}
                </span>
                <StatusDot status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ============ ZONA 2 — ATENÇÃO ============ */}

      <h3 className="mt-10 mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
        Precisa de atenção
      </h3>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Novas reservas online · 24h" href="/admin/reservas" linkLabel="Agenda">
          {data.recentOnline.length === 0 ? (
            <EmptyRow text="Sem reservas online nas últimas 24h." />
          ) : (
            <AttentionList items={data.recentOnline} accent="#2D7A55" />
          )}
        </Panel>
        <Panel title="Cancelamentos · 48h" href="/admin/reservas" linkLabel="Agenda">
          {data.recentCancellations.length === 0 ? (
            <EmptyRow text="Sem cancelamentos recentes. 🙌" />
          ) : (
            <AttentionList items={data.recentCancellations} accent="#B23C3C" />
          )}
        </Panel>
      </section>

      {/* ============ ZONA 3 — O NEGÓCIO ============ */}

      <h3 className="mt-10 mb-4 text-xs tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
        O negócio
      </h3>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Receita da semana */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
        >
          <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
            Receita esta semana
          </p>
          <p className="mt-2 font-serif text-3xl" style={{ color: '#1F3D2E' }}>
            {euros(data.revenueWeek)}
          </p>
          {weekDelta !== null && (
            <p
              className="mt-1 text-xs font-medium"
              style={{ color: weekDelta >= 0 ? '#2D7A55' : '#B23C3C' }}
            >
              {weekDelta >= 0 ? '▲' : '▼'} {Math.abs(weekDelta)}% vs semana anterior
            </p>
          )}
          <div className="mt-4 flex gap-5 text-xs" style={{ color: '#5A5A5A' }}>
            <span className="inline-flex items-center gap-1.5">
              <UserPlus size={13} style={{ color: '#D4AF6E' }} />
              {data.newClientsMonth} novas clientes no mês
            </span>
          </div>
          <div className="mt-1 text-xs" style={{ color: '#5A5A5A' }}>
            <span className="inline-flex items-center gap-1.5">
              <Globe size={13} style={{ color: '#D4AF6E' }} />
              {data.onlineShare}% das reservas do mês são online
            </span>
          </div>
          <Link
            href="/admin/relatorios/financeiro"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: '#B8924A' }}
          >
            Relatório completo <ArrowRight size={12} />
          </Link>
        </div>

        {/* Ocupação por profissional */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
        >
          <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
            Ocupação · semana até hoje
          </p>
          <ul className="mt-4 space-y-3">
            {data.occupancy.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span style={{ color: '#1A1A1A' }}>{s.name}</span>
                  <span className="font-mono" style={{ color: occColor(s.percent) }}>
                    {s.percent}%
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'rgba(31,61,46,0.08)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.percent}%`, backgroundColor: occColor(s.percent) }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed" style={{ color: '#9A9A9A' }}>
            Saudável: 80–85%. Abaixo de 70% há horas por vender.
          </p>
        </div>

        {/* Top serviços */}
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
        >
          <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
            Top serviços · semana
          </p>
          {data.topServices.length === 0 ? (
            <EmptyRow text="Sem dados esta semana." />
          ) : (
            <ul className="mt-4 space-y-2.5">
              {data.topServices.map((s, i) => (
                <li key={s._id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 font-serif text-base" style={{ color: '#D4AF6E' }}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate" style={{ color: '#1A1A1A' }}>
                    {s._id}
                  </span>
                  <span className="shrink-0 font-mono text-xs" style={{ color: '#5A5A5A' }}>
                    {s.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Subcomponentes
// ============================================================

function KpiCard({
  label,
  value,
  icon,
  href,
  alert = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border p-4 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: alert ? 'rgba(178,60,60,0.35)' : 'rgba(31,61,46,0.08)',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: '#5A5A5A' }}>
          {label}
        </span>
        <span style={{ color: alert ? '#B23C3C' : '#D4AF6E' }}>{icon}</span>
      </div>
      <p className="font-serif text-2xl sm:text-3xl" style={{ color: '#1F3D2E' }}>
        {value}
      </p>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-xs font-semibold tracking-wide uppercase transition-all hover:-translate-y-[1px] hover:shadow-md"
      style={
        primary
          ? { backgroundColor: '#D4AF6E', borderColor: '#D4AF6E', color: '#1F3D2E' }
          : { backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.15)', color: '#1F3D2E' }
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </Link>
  );
}

function Panel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{ backgroundColor: '#FFFFFF', borderColor: 'rgba(31,61,46,0.08)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          {title}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium"
          style={{ color: '#B8924A' }}
        >
          {linkLabel} <ArrowRight size={12} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function AttentionList({ items, accent }: { items: AttentionItem[]; accent: string }) {
  return (
    <ul className="divide-y" style={{ borderColor: 'rgba(31,61,46,0.06)' }}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: '#1A1A1A' }}>
              {item.title}
            </p>
            <p className="truncate text-xs" style={{ color: '#5A5A5A' }}>
              {item.subtitle}
            </p>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1 font-mono text-xs"
            style={{ color: '#5A5A5A' }}
          >
            <Clock size={11} />
            {item.when}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#C4861E',
    confirmed: '#2D7A55',
    'in-progress': '#2C5F8A',
    completed: '#9A9A9A',
    'no-show': '#B23C3C',
  };
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: colors[status] ?? '#9A9A9A' }}
      title={status}
      aria-label={status}
    />
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-xs italic" style={{ color: '#9A9A9A' }}>
      {text}
    </p>
  );
}

// ============================================================
// Helpers
// ============================================================

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function occColor(percent: number): string {
  if (percent >= 80) return '#2D7A55';
  if (percent >= 70) return '#C4861E';
  return '#B23C3C';
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}
