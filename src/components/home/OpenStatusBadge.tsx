// 📄 src/components/home/OpenStatusBadge.tsx
/**
 * Chi Sublime — OpenStatusBadge
 * ============================================================
 *
 * Badge de estado em tempo real na hero: Aberto / Fecha em
 * breve / Abre em breve / Fechado (com próxima abertura).
 *
 * Boas práticas aplicadas:
 * - Fuso do SALÃO (Europe/Lisbon), não do visitante
 * - 4 estados com cor + TEXTO explícito (nunca só cor)
 * - Dot com pulse subtil apenas quando aberto
 * - Client Component: calcula após mount (zero hydration
 *   mismatch) e atualiza a cada 30s + ao voltar ao separador
 * - Placeholder com altura fixa → sem layout shift (CLS)
 * - role="status" para leitores de ecrã
 *
 * ⚠️ O horário NÃO está aqui. Vem de SALON_HOURS
 * (src/lib/constants/business.ts). Este componente é agnóstico:
 * calcula o próximo dia aberto e interpola o nome do dia via
 * Intl — se o Jean mudar o horário outra vez, nada aqui muda.
 *
 * Cores críticas em inline style (regra do projeto).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  nextOpenDay,
  SALON_HOURS,
  SALON_TIMEZONE,
  type WeekDayIndex,
} from '@/lib/constants/business';

/** "em breve" = ≤ 60 min do evento */
const SOON_WINDOW = 60;

/** Mapa 'Sun'…'Sat' → 0…6, para ler o dia no fuso do salão */
const WEEKDAY_INDEX: Record<string, WeekDayIndex> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type StatusKind =
  | 'open' // Aberto · até às 18:00
  | 'closingSoon' // Fecha em breve · 18:00
  | 'openingSoon' // Abre em breve · 09:00
  | 'opensToday' // Fechado · Abre hoje às 09:00
  | 'opensTomorrow' // Fechado · Abre amanhã às 09:00
  | 'opensLater'; // Fechado · Abre terça-feira às 09:00

type Status = {
  kind: StatusKind;
  /** Hora relevante para a mensagem (fecho se aberto, abertura se fechado) */
  time: string;
  /** Dia da semana da próxima abertura (só usado em 'opensLater') */
  dayIndex?: WeekDayIndex;
};

/** timeToMinutes local — "09:00" → 540 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** Estado atual do salão, calculado no fuso Europe/Lisbon. */
function getStatus(now = new Date()): Status {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const today = WEEKDAY_INDEX[get('weekday')] ?? 0;
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);

  const hours = SALON_HOURS[today];

  // ── Hoje é dia de abertura ──────────────────────────────
  if (hours.open) {
    const openMin = toMinutes(hours.start);
    const closeMin = toMinutes(hours.end);

    if (mins >= openMin && mins < closeMin) {
      return {
        kind: closeMin - mins <= SOON_WINDOW ? 'closingSoon' : 'open',
        time: hours.end,
      };
    }

    if (mins < openMin) {
      return {
        kind: openMin - mins <= SOON_WINDOW ? 'openingSoon' : 'opensToday',
        time: hours.start,
      };
    }
    // Já fechou hoje → cai para o cálculo do próximo dia
  }

  // ── Fechado → qual é a próxima abertura? ────────────────
  const next = nextOpenDay(today);
  if (!next || !next.hours.open) {
    // Defensivo: salão sem nenhum dia aberto
    return { kind: 'opensLater', time: '09:00', dayIndex: today };
  }

  if (next.offset === 1) return { kind: 'opensTomorrow', time: next.hours.start };
  return { kind: 'opensLater', time: next.hours.start, dayIndex: next.day };
}

/** Nome do dia da semana na língua ativa ("terça-feira" / "Tuesday") */
function weekdayName(dayIndex: WeekDayIndex, locale: string): string {
  // 2024-01-07 foi um domingo → base fiável para gerar qualquer dia
  const ref = new Date(Date.UTC(2024, 0, 7 + dayIndex, 12));
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(ref);
}

/* ── Cores por estado (dot) — legíveis sobre a foto escura ── */

const DOT_COLOR: Record<StatusKind, string> = {
  open: '#34D399', // verde vivo
  closingSoon: '#FBBF24', // âmbar
  openingSoon: '#FBBF24', // âmbar
  opensToday: 'rgba(250,247,242,0.55)', // neutro
  opensTomorrow: 'rgba(250,247,242,0.55)',
  opensLater: 'rgba(250,247,242,0.55)',
};

/* ── Componente ────────────────────────────────────────────── */

export function OpenStatusBadge() {
  const t = useTranslations('home.hero.status');
  const locale = useLocale();
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(() => setStatus(getStatus()), []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const label = status
    ? t(status.kind, {
        time: status.time,
        day: status.dayIndex !== undefined ? weekdayName(status.dayIndex, locale) : '',
      })
    : '';

  return (
    /* Altura reservada sempre — o badge aparece sem empurrar o layout */
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
          <span>{label}</span>
        </Link>
      )}
    </div>
  );
}
