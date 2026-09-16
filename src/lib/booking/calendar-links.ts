// 📄 src/lib/booking/calendar-links.ts
/**
 * Chi Sublime — "Adicionar ao calendário"
 * ============================================================
 *
 * Gera o convite .ics (RFC 5545) anexado ao email de confirmação e
 * descarregável na página de sucesso, e o link direto do Google
 * Calendar. O .ics abre em Apple Calendar, Outlook e Gmail.
 *
 * Datas sempre em UTC (sufixo Z) — o calendário do cliente converte
 * para o fuso dele, sem ambiguidades de horário de verão.
 *
 * Módulo puro (sem Node APIs): usado no servidor e no browser.
 */

import { SALON_CONTACT_FALLBACK } from '@/lib/constants/business';

export type CalendarEventInput = {
  bookingNumber: string;
  start: Date;
  end: Date;
  services: string;
  staffName: string;
  /** Link para o cliente ver/gerir a marcação */
  url?: string;
};

export const SALON_LOCATION = `Chi Sublime, ${SALON_CONTACT_FALLBACK.address}, ${SALON_CONTACT_FALLBACK.postalCode} ${SALON_CONTACT_FALLBACK.city}, Portugal`;

function toIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escape de TEXT segundo RFC 5545 (\\, ;, , e quebras de linha). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Dobra linhas a 75 octetos (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    const limit = out.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      out.push(current);
      current = char;
      currentBytes = size;
    } else {
      current += char;
      currentBytes += size;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

function eventTitle(input: CalendarEventInput): string {
  return `Chi Sublime · ${input.services}`;
}

function eventDescription(input: CalendarEventInput): string {
  return [
    `Marcação ${input.bookingNumber}`,
    `Serviços: ${input.services}`,
    `Com: ${input.staffName}`,
    `Contacto: ${SALON_CONTACT_FALLBACK.phone}`,
    input.url ? `Gerir marcação: ${input.url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildIcs(input: CalendarEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chi Sublime//Marcacoes//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.bookingNumber}@chisublime.pt`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(input.start)}`,
    `DTEND:${toIcsDate(input.end)}`,
    `SUMMARY:${escapeText(eventTitle(input))}`,
    `DESCRIPTION:${escapeText(eventDescription(input))}`,
    `LOCATION:${escapeText(SALON_LOCATION)}`,
    ...(input.url ? [`URL:${input.url}`] : []),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Marcação no Chi Sublime',
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(input: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(input),
    dates: `${toIcsDate(input.start)}/${toIcsDate(input.end)}`,
    details: eventDescription(input),
    location: SALON_LOCATION,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
