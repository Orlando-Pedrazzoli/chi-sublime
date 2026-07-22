// 📄 src/components/home/OpenStatusBadge.tsx
/**
 * Chi Sublime — OpenStatusBadge
 * ============================================================
 *
 * Badge de estado em tempo real na hero: Aberto / Fecha em
 * breve / Abre em breve / Fechado (com próxima abertura).
 *
 * Boas práticas aplicadas:
 * - Fuso do SALÃO (Europe/Lisbon), não do visitante — um
 *   cliente a ver o site do Brasil vê o estado real da loja
 * - 4 estados com cor + TEXTO explícito (nunca só cor)
 * - Dot com pulse subtil apenas quando aberto
 * - Client Component: calcula após mount (zero hydration
 *   mismatch) e atualiza a cada 30s + ao voltar ao separador
 * - Placeholder com altura fixa → sem layout shift (CLS)
 * - role="status" para leitores de ecrã
 * - Clicável → âncora #contact (horário completo)
 *
 * Horário: Seg–Sex 10:00–19:00 · Sáb/Dom encerrado.
 * Cores críticas em inline style (regra do projeto).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/* ── Horário do salão (minutos desde as 00:00, Europe/Lisbon) ── */

const OPEN_MIN = 10 * 60; // 10:00
const CLOSE_MIN = 19 * 60; // 19:00
const SOON_WINDOW = 60; // "em breve" = ≤ 60 min
const OPEN_LABEL = '10:00';
const CLOSE_LABEL = '19:00';
const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

type Status =
  | { kind: 'open' } // Aberto · até 19:00
  | { kind: 'closingSoon' } // Fecha em breve · 19:00
  | { kind: 'openingSoon' } // Abre em breve · 10:00
  | { kind: 'opensToday' } // Fechado · Abre hoje às 10:00
  | { kind: 'opensTomorrow' } // Fechado · Abre amanhã às 10:00
  | { kind: 'opensMonday' }; // Fechado · Abre segunda às 10:00

/** Estado atual do salão, calculado no fuso Europe/Lisbon. */
function getStatus(now = new Date()): Status {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday'); // 'Mon'…'Sun'
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  const isWeekday = WEEKDAYS.has(weekday);

  if (isWeekday && mins >= OPEN_MIN && mins < CLOSE_MIN) {
    return CLOSE_MIN - mins <= SOON_WINDOW ? { kind: 'closingSoon' } : { kind: 'open' };
  }

  // Fechado → qual é a próxima abertura?
  if (isWeekday && mins < OPEN_MIN) {
    return OPEN_MIN - mins <= SOON_WINDOW ? { kind: 'openingSoon' } : { kind: 'opensToday' };
  }
  if (weekday === 'Fri' || weekday === 'Sat') return { kind: 'opensMonday' };
  if (weekday === 'Sun') return { kind: 'opensTomorrow' }; // amanhã = segunda
  return { kind: 'opensTomorrow' }; // Seg–Qui após as 19:00
}

/* ── Cores por estado (dot) — legíveis sobre a foto escura ── */

const DOT_COLOR: Record<Status['kind'], string> = {
  open: '#34D399', // verde vivo
  closingSoon: '#FBBF24', // âmbar
  openingSoon: '#FBBF24', // âmbar
  opensToday: 'rgba(250,247,242,0.55)', // neutro
  opensTomorrow: 'rgba(250,247,242,0.55)',
  opensMonday: 'rgba(250,247,242,0.55)',
};

/* ── Componente ────────────────────────────────────────────── */

export function OpenStatusBadge() {
  const t = useTranslations('home.hero.status');
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(() => setStatus(getStatus()), []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    // Recalcular quando o utilizador volta ao separador
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const isOpen = status?.kind === 'open' || status?.kind === 'closingSoon';
  const time = isOpen ? CLOSE_LABEL : OPEN_LABEL;

  return (
    /* Altura reservada sempre — o badge aparece dentro sem empurrar o layout */
    <div className="mb-6 h-[34px]">
      {status && (
        <Link
          href="#contact"
          role="status"
          aria-live="polite"
          className="inline-flex h-[34px] items-center gap-2.5 border px-4 text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur-sm transition-opacity duration-500 hover:opacity-85"
          style={{
            color: '#FAF7F2',
            borderColor: 'rgba(250,247,242,0.35)',
            backgroundColor: 'rgba(20,40,32,0.35)',
          }}
        >
          {/* Dot — pulse subtil apenas quando aberto */}
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            {status.kind === 'open' && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: DOT_COLOR[status.kind] }}
              />
            )}
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: DOT_COLOR[status.kind] }}
            />
          </span>
          <span>{t(status.kind, { time })}</span>
        </Link>
      )}
    </div>
  );
}
