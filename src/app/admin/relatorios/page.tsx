// 📄 src/app/admin/relatorios/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { LineChart, Receipt, Users, UserCog, ChevronRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Relatórios',
  robots: { index: false, follow: false },
};

const REPORTS = [
  {
    href: '/admin/relatorios/financeiro',
    icon: LineChart,
    title: 'Financeiro',
    description: 'Receita, despesa e resultado por período (com PDF).',
    ready: true,
  },
  {
    href: '/admin/relatorios/iva',
    icon: Receipt,
    title: 'IVA',
    description: 'IVA liquidado e suportado.',
    ready: false,
  },
  {
    href: '/admin/relatorios/staff',
    icon: UserCog,
    title: 'Equipa',
    description: 'Desempenho e comissões por profissional.',
    ready: false,
  },
  {
    href: '/admin/relatorios/clientes',
    icon: Users,
    title: 'Clientes',
    description: 'Clientes mais valiosos e frequência.',
    ready: false,
  },
];

export default async function RelatoriosPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-chi-green-darker font-serif text-2xl">Relatórios</h1>
        <p className="text-chi-charcoal-soft mt-1 text-sm">Análises do salão por período.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group border-chi-border hover:border-chi-gold flex items-start gap-3 rounded-lg border bg-white p-4 transition-colors"
          >
            <span className="bg-chi-sand text-chi-green-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
              <r.icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-chi-charcoal font-medium">{r.title}</span>
                {!r.ready && (
                  <span className="bg-chi-sand text-chi-charcoal-soft rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                    Em breve
                  </span>
                )}
              </div>
              <p className="text-chi-charcoal-soft mt-0.5 text-sm">{r.description}</p>
            </div>
            <ChevronRight
              size={18}
              className="text-chi-charcoal-light mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
