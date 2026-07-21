// 📄 src/app/admin/definicoes/notificacoes/page.tsx
/**
 * Chi Sublime — Definições » Notificações
 * ============================================================
 *
 * Painel de estado das comunicações automáticas: que emails o
 * sistema envia, quando, e para onde. Os destinos técnicos vivem
 * nas variáveis de ambiente do servidor (Vercel) — esta página
 * mostra a configuração ativa em vez de a duplicar na BD.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Mail, BellRing, CalendarX2, Wallet } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Notificações',
  robots: { index: false, follow: false },
};

type FlowStatus = 'ok' | 'off';

function StatusBadge({ status }: { status: FlowStatus }) {
  const isOk = status === 'ok';
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
      style={{
        backgroundColor: isOk ? 'rgba(151,196,89,0.18)' : 'rgba(200,90,60,0.12)',
        color: isOk ? '#3A5A1F' : '#8A3A2A',
      }}
    >
      {isOk ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {isOk ? 'Ativo' : 'Não configurado'}
    </span>
  );
}

export default async function NotificacoesPage() {
  await requireAdmin();

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const salonEmail = process.env.SALON_NOTIFICATION_EMAIL ?? '—';
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? '—';
  const cronConfigured = Boolean(process.env.CRON_SECRET);

  const flows: Array<{
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    title: string;
    trigger: string;
    to: string;
    status: FlowStatus;
  }> = [
    {
      icon: Mail,
      title: 'Confirmação de reserva',
      trigger: 'Enviada ao cliente assim que a reserva é criada (online ou no balcão).',
      to: 'Email do cliente',
      status: resendConfigured ? 'ok' : 'off',
    },
    {
      icon: BellRing,
      title: 'Alerta de nova reserva',
      trigger: 'Enviado ao salão a cada reserva online nova.',
      to: salonEmail,
      status: resendConfigured && salonEmail !== '—' ? 'ok' : 'off',
    },
    {
      icon: BellRing,
      title: 'Lembrete de véspera',
      trigger:
        'Enviado ao cliente uma vez por dia para reservas nas 36 horas seguintes (tarefa automática ~09h UTC).',
      to: 'Email do cliente',
      status: resendConfigured && cronConfigured ? 'ok' : 'off',
    },
    {
      icon: CalendarX2,
      title: 'Aviso de cancelamento',
      trigger: 'Enviado ao cliente quando a reserva é cancelada — por ele ou pelo salão.',
      to: 'Email do cliente',
      status: resendConfigured ? 'ok' : 'off',
    },
    {
      icon: Wallet,
      title: 'Despesas recorrentes',
      trigger:
        'Não é um email: tarefa automática diária (~05h30 UTC) que lança as despesas marcadas como recorrentes.',
      to: 'Registo automático em Despesas',
      status: cronConfigured ? 'ok' : 'off',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/definicoes"
          className="text-chi-charcoal-soft hover:text-chi-green-deep inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Definições
        </Link>
        <h1 className="text-chi-green-darker mt-2 font-serif text-2xl">Notificações</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          As comunicações automáticas do sistema e o seu estado atual. Todos os emails saem de{' '}
          <span className="font-medium">{fromEmail}</span>.
        </p>
      </div>

      <ul
        className="divide-y overflow-hidden rounded-lg border bg-white"
        style={{ borderColor: 'rgba(31,61,46,0.08)' }}
      >
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <li
              key={flow.title}
              className="flex items-start gap-4 px-5 py-4"
              style={{ borderColor: 'rgba(31,61,46,0.06)' }}
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: 'rgba(212,175,110,0.14)', color: '#1F3D2E' }}
              >
                <Icon size={16} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                    {flow.title}
                  </p>
                  <StatusBadge status={flow.status} />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#5A5A5A' }}>
                  {flow.trigger}
                </p>
                <p className="mt-1 text-xs" style={{ color: '#8A8A8A' }}>
                  Destino: <span style={{ color: '#1F3D2E' }}>{flow.to}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className="rounded-lg border px-4 py-3 text-xs leading-relaxed"
        style={{
          borderColor: 'rgba(212,175,110,0.4)',
          backgroundColor: 'rgba(212,175,110,0.08)',
          color: '#5A4A2A',
        }}
      >
        Os endereços técnicos (remetente e caixa do salão) fazem parte da configuração do servidor.
        Para os alterar, contacta quem gere o alojamento da aplicação.
      </div>
    </div>
  );
}
