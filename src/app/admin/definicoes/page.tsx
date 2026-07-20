// 📄 src/app/admin/definicoes/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Receipt, Bell, Users, ChevronRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Definições',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  {
    href: '/admin/definicoes/faturacao',
    icon: Receipt,
    title: 'Faturação',
    description: 'Provider (Mock/Moloni), IVA e IDs da conta Moloni.',
    ready: true,
  },
  {
    href: '/admin/definicoes/empresa',
    icon: Building2,
    title: 'Empresa',
    description: 'Dados do salão, morada e contactos.',
    ready: false,
  },
  {
    href: '/admin/definicoes/notificacoes',
    icon: Bell,
    title: 'Notificações',
    description: 'Emails, lembretes e comunicações.',
    ready: false,
  },
  {
    href: '/admin/definicoes/utilizadores',
    icon: Users,
    title: 'Utilizadores',
    description: 'Acessos de administração.',
    ready: false,
  },
];

export default async function DefinicoesPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Definições</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">
          Configurações do salão e da aplicação.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const inner = (
            <>
              <span className="bg-chi-sand text-chi-green-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                <s.icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-chi-charcoal font-medium">{s.title}</span>
                  {!s.ready && (
                    <span className="bg-chi-sand text-chi-charcoal-soft rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      Em breve
                    </span>
                  )}
                </div>
                <p className="text-chi-charcoal-soft mt-0.5 text-sm">{s.description}</p>
              </div>
              {s.ready && (
                <ChevronRight
                  size={18}
                  className="text-chi-charcoal-light mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              )}
            </>
          );

          // Secções em desenvolvimento: card informativo, sem navegação
          if (!s.ready) {
            return (
              <div
                key={s.href}
                aria-disabled="true"
                className="border-chi-border flex items-start gap-3 rounded-lg border bg-white p-4 opacity-60"
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={s.href}
              href={s.href}
              className="group border-chi-border hover:border-chi-gold flex items-start gap-3 rounded-lg border bg-white p-4 transition-colors"
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
