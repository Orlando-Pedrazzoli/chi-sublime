// 📄 src/components/legal/LegalPage.tsx
/**
 * Chi Sublime — Layout das páginas legais
 * ============================================================
 *
 * Wrapper partilhado por /privacidade, /termos, /cookies,
 * /rgpd e /cancelamento: header compacto na linguagem do site,
 * corpo em prosa legível, data de atualização.
 */

import type { ReactNode } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updated: string; // ex: "julho de 2026"
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, updated, children }: LegalPageProps) {
  return (
    <>
      <PublicNavbar />
      <main className="bg-chi-cream min-h-screen pt-32 pb-24 md:pt-40">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <header className="mb-12 md:mb-16">
            <p className="eyebrow text-chi-gold-deep mb-6">{eyebrow}</p>
            <h1 className="text-chi-charcoal font-serif text-4xl text-balance md:text-5xl">
              {title}
            </h1>
            <p className="text-chi-charcoal-light mt-4 text-xs tracking-[0.15em] uppercase">
              Última atualização: {updated}
            </p>
          </header>

          <div className="legal-prose">{children}</div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

/**
 * Subcomponentes de prosa — mantêm as 5 páginas consistentes
 * sem depender de plugin de tipografia.
 */

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-chi-green-deep mb-4 font-serif text-2xl">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-chi-charcoal-soft text-base leading-[1.85]">{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="text-chi-charcoal-soft space-y-2.5 text-base leading-[1.75]">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-chi-gold-deep mt-[2px] shrink-0" aria-hidden>
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
