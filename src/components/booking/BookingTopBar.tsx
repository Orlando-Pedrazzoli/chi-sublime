// 📄 src/components/booking/BookingTopBar.tsx
/**
 * Chi Sublime — Booking Top Bar (mobile, tipo app)
 * ============================================================
 *
 * Barra de topo do funil de marcações em mobile/tablet (< 1024px).
 * Substitui a navbar pública e o stepper de círculos: num funil de
 * marcação o cliente só precisa de saber ONDE está, como VOLTAR e
 * como SAIR — menos distrações, mais conclusões.
 *
 *  [←]   PASSO 2 DE 3      [×]
 *           Horário
 *  ▬▬▬▬▬  ▬▬▬▬▬  ─────      (progresso: feito · atual · por fazer)
 *
 *  - ← volta ao passo anterior (não aparece no passo 1)
 *  - × sai do funil para a página inicial (o carrinho fica guardado
 *    no sessionStorage — se voltar, continua onde estava)
 *  - Alvos de toque de 44px, fica presa ao topo (sticky)
 *
 * Em desktop não aparece (`bk-mobile-only`). Estilos em globals.css
 * (secção "MARCAÇÕES — funil do cliente em mobile").
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { BookingStep } from './BookingStepper';

const STEPS: BookingStep[] = ['service', 'time', 'confirm'];

/** Para onde o ← leva em cada passo (null = sem botão de voltar) */
const BACK_HREF: Record<BookingStep, string | null> = {
  service: null,
  time: '/marcacoes',
  confirm: '/marcacoes/horario',
};

type Props = {
  step: BookingStep;
};

export function BookingTopBar({ step }: Props) {
  const t = useTranslations('booking');
  const current = STEPS.indexOf(step) + 1;
  const backHref = BACK_HREF[step];

  return (
    <header className="bk-topbar bk-mobile-only">
      <div className="bk-topbar-row">
        {backHref ? (
          <Link href={backHref} className="bk-icon-btn" aria-label={t('app.back')}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 5 8 12 15 19" />
            </svg>
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        <p className="bk-topbar-title">
          <span className="bk-topbar-kicker">
            {t('pages.stepLabel', { current, total: STEPS.length })}
          </span>
          <span className="bk-topbar-name">{t(`stepper.${step}`)}</span>
        </p>

        <Link href="/" className="bk-icon-btn" aria-label={t('app.exit')}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
      </div>

      {/* Progresso — decorativo: a posição já é anunciada no texto acima */}
      <ol className="bk-progress" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li
            key={s}
            data-state={i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'todo'}
          />
        ))}
      </ol>
    </header>
  );
}
