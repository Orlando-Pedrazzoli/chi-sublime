// ðŸ“„ src/lib/email/send.ts
/**
 * Chi Sublime â€” Senders de email (alto nÃ­vel)
 * ============================================================
 *
 * Cada funÃ§Ã£o renderiza um template react-email para HTML+texto e
 * envia via `sendEmail` (resend.ts). Templates sÃ£o componentes puros;
 * aqui Ã© que se constroem os URLs e os assuntos.
 *
 * NOVO: sendNewBookingAdminEmail â€” alerta ao SALÃƒO a cada reserva
 * nova (substitui o push do Noona HQ). DestinatÃ¡rio configurÃ¡vel
 * via SALON_NOTIFICATION_EMAIL (fallback: FROM_EMAIL).
 *
 * MarcaÃ§Ãµes (polÃ­tica de confirmaÃ§Ã£o em lib/booking/policy.ts):
 *  - sendBookingConfirmationEmail  â†’ confirmada, com convite .ics anexado
 *  - sendBookingRequestReceivedEmail â†’ pedido pendente (sÃ³ modo manual)
 *  - sendBookingCancellationEmail  â†’ cancelada | pedido recusado
 *  - sendBookingCancelledAdminEmail â†’ alerta ao salÃ£o quando a cliente cancela
 *
 * Compatibilidade: `sendPasswordResetEmail({ to, name, token })`
 * mantÃ©m a assinatura antiga (usada pelo auth.ts). A infraestrutura
 * (sendEmail, helpers de URL, tipos) Ã© re-exportada para quem antes
 * importava daqui.
 */

import { createElement, type ReactElement } from 'react';
import { render } from '@react-email/components';

import {
  sendEmail,
  APP_URL,
  FROM_EMAIL,
  getResetPasswordUrl,
  getBookingDetailUrl,
  getLoginUrl,
  getVerifyEmailUrl,
  type SendEmailResult,
} from './resend';

import { PasswordResetEmail } from './templates/password-reset';
import { WelcomeEmail } from './templates/welcome';
import { EmailVerificationEmail } from './templates/email-verification';
import { BookingConfirmationEmail } from './templates/booking-confirmation';
import { BookingReminderEmail } from './templates/booking-reminder';
import { BookingCancellationEmail } from './templates/booking-cancellation';
import { InvoiceReceiptEmail } from './templates/invoice-receipt';
import { NewBookingAdminEmail } from './templates/new-booking-admin';
import { BookingRequestReceivedEmail } from './templates/booking-request-received';
import { BookingCancelledAdminEmail } from './templates/booking-cancelled-admin';
import { buildIcs, googleCalendarUrl, SALON_LOCATION } from '@/lib/booking/calendar-links';
import { BOOKING_RULES } from '@/lib/constants/business';

// Re-export da infraestrutura (backward-compat)
export {
  sendEmail,
  getResetPasswordUrl,
  getBookingDetailUrl,
  getLoginUrl,
  getVerifyEmailUrl,
} from './resend';
export type { SendEmailInput, SendEmailResult } from './resend';

/**
 * Para onde vÃ£o os alertas operacionais do salÃ£o (novas reservas).
 * Definir SALON_NOTIFICATION_EMAIL no .env; sem ela, cai no FROM
 * (a caixa reservas@chisublime.pt recebe os prÃ³prios alertas).
 */
export const SALON_NOTIFICATION_EMAIL = process.env.SALON_NOTIFICATION_EMAIL ?? FROM_EMAIL;

// ============================================================
// Render helper
// ============================================================

async function renderEmail(node: ReactElement): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(node), render(node, { plainText: true })]);
  return { html, text };
}

// ============================================================
// Auth
// ============================================================

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<SendEmailResult> {
  const node = createElement(PasswordResetEmail, {
    name: params.name,
    resetUrl: getResetPasswordUrl(params.token),
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: 'RecuperaÃ§Ã£o de password â€” Chi Sublime',
    html,
    text,
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<SendEmailResult> {
  const node = createElement(WelcomeEmail, { name: params.name, loginUrl: getLoginUrl() });
  const { html, text } = await renderEmail(node);
  return sendEmail({ to: params.to, subject: 'Bem-vindo(a) ao Chi Sublime', html, text });
}

export async function sendEmailVerificationEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<SendEmailResult> {
  const node = createElement(EmailVerificationEmail, {
    name: params.name,
    verifyUrl: getVerifyEmailUrl(params.token),
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({ to: params.to, subject: 'Confirma o teu email â€” Chi Sublime', html, text });
}

// ============================================================
// Reservas
// ============================================================

export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  /** Instantes reais â€” para o convite de calendÃ¡rio */
  startTime?: Date;
  endTime?: Date;
  approvedBySalon?: boolean;
}): Promise<SendEmailResult> {
  const detailUrl = getBookingDetailUrl(params.bookingNumber);
  const calendarEvent =
    params.startTime && params.endTime
      ? {
          bookingNumber: params.bookingNumber,
          start: params.startTime,
          end: params.endTime,
          services: params.services,
          staffName: params.staffName,
          url: detailUrl,
        }
      : null;

  const node = createElement(BookingConfirmationEmail, {
    name: params.name,
    bookingNumber: params.bookingNumber,
    date: params.date,
    time: params.time,
    services: params.services,
    staffName: params.staffName,
    total: params.total,
    location: SALON_LOCATION,
    detailUrl,
    calendarUrl: calendarEvent ? googleCalendarUrl(calendarEvent) : undefined,
    cancellationWindowHours: BOOKING_RULES.cancellationWindowHours,
    approvedBySalon: params.approvedBySalon,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: `MarcaÃ§Ã£o confirmada Â· ${params.date}, ${params.time} â€” Chi Sublime`,
    html,
    text,
    attachments: calendarEvent
      ? [
          {
            filename: `chi-sublime-${params.bookingNumber}.ics`,
            content: buildIcs(calendarEvent),
            contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
          },
        ]
      : undefined,
  });
}

export async function sendBookingRequestReceivedEmail(params: {
  to: string;
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
}): Promise<SendEmailResult> {
  const node = createElement(BookingRequestReceivedEmail, {
    name: params.name,
    bookingNumber: params.bookingNumber,
    date: params.date,
    time: params.time,
    services: params.services,
    staffName: params.staffName,
    total: params.total,
    detailUrl: getBookingDetailUrl(params.bookingNumber),
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: `Pedido de marcaÃ§Ã£o recebido Â· ${params.bookingNumber} â€” Chi Sublime`,
    html,
    text,
  });
}

export async function sendNewBookingAdminEmail(params: {
  bookingNumber: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
  total: string;
  source: string;
  pendingApproval?: boolean;
}): Promise<SendEmailResult> {
  const node = createElement(NewBookingAdminEmail, {
    bookingNumber: params.bookingNumber,
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    date: params.date,
    time: params.time,
    services: params.services,
    staffName: params.staffName,
    total: params.total,
    source: params.source,
    agendaUrl: `${APP_URL}/admin/reservas`,
    pendingApproval: params.pendingApproval,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: SALON_NOTIFICATION_EMAIL,
    subject: `${params.pendingApproval ? 'â³ Por confirmar' : 'ðŸ—“ Nova marcaÃ§Ã£o'} ${params.time} Â· ${params.clientName} â€” ${params.bookingNumber}`,
    html,
    text,
  });
}

export async function sendBookingReminderEmail(params: {
  to: string;
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  services: string;
  staffName: string;
}): Promise<SendEmailResult> {
  const node = createElement(BookingReminderEmail, {
    name: params.name,
    bookingNumber: params.bookingNumber,
    date: params.date,
    time: params.time,
    services: params.services,
    staffName: params.staffName,
    detailUrl: getBookingDetailUrl(params.bookingNumber),
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: `Lembrete da tua marcaÃ§Ã£o Â· ${params.bookingNumber} â€” Chi Sublime`,
    html,
    text,
  });
}

export async function sendBookingCancellationEmail(params: {
  to: string;
  name: string;
  bookingNumber: string;
  date: string;
  time: string;
  reason?: string;
  variant?: 'cancelled' | 'declined';
}): Promise<SendEmailResult> {
  const declined = params.variant === 'declined';
  const node = createElement(BookingCancellationEmail, {
    name: params.name,
    bookingNumber: params.bookingNumber,
    date: params.date,
    time: params.time,
    reason: params.reason,
    rebookUrl: `${APP_URL}/marcacoes`,
    variant: params.variant,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: declined
      ? `NÃ£o foi possÃ­vel confirmar o teu pedido Â· ${params.bookingNumber} â€” Chi Sublime`
      : `MarcaÃ§Ã£o cancelada Â· ${params.bookingNumber} â€” Chi Sublime`,
    html,
    text,
  });
}

export async function sendBookingCancelledAdminEmail(params: {
  bookingNumber: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  time: string;
  services?: string;
  staffName?: string;
  reason?: string;
}): Promise<SendEmailResult> {
  const node = createElement(BookingCancelledAdminEmail, {
    ...params,
    agendaUrl: `${APP_URL}/admin/reservas`,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: SALON_NOTIFICATION_EMAIL,
    subject: `âŒ Cancelamento ${params.time} Â· ${params.clientName} â€” ${params.bookingNumber}`,
    html,
    text,
  });
}

// ============================================================
// FaturaÃ§Ã£o
// ============================================================

export async function sendInvoiceReceiptEmail(params: {
  to: string;
  name: string;
  documentNumber: string;
  date: string;
  total: string;
  pdfUrl: string;
}): Promise<SendEmailResult> {
  const node = createElement(InvoiceReceiptEmail, {
    name: params.name,
    documentNumber: params.documentNumber,
    date: params.date,
    total: params.total,
    pdfUrl: params.pdfUrl,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: `O teu documento ${params.documentNumber} â€” Chi Sublime`,
    html,
    text,
  });
}
