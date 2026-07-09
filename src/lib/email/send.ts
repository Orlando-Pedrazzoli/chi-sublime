// 📄 src/lib/email/send.ts
/**
 * Chi Sublime — Senders de email (alto nível)
 * ============================================================
 *
 * Cada função renderiza um template react-email para HTML+texto e
 * envia via `sendEmail` (resend.ts). Templates são componentes puros;
 * aqui é que se constroem os URLs e os assuntos.
 *
 * Compatibilidade: `sendPasswordResetEmail({ to, name, token })`
 * mantém a assinatura antiga (usada pelo auth.ts). A infraestrutura
 * (sendEmail, helpers de URL, tipos) é re-exportada para quem antes
 * importava daqui.
 */

import { createElement, type ReactElement } from 'react';
import { render } from '@react-email/components';

import {
  sendEmail,
  APP_URL,
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

// Re-export da infraestrutura (backward-compat)
export {
  sendEmail,
  getResetPasswordUrl,
  getBookingDetailUrl,
  getLoginUrl,
  getVerifyEmailUrl,
} from './resend';
export type { SendEmailInput, SendEmailResult } from './resend';

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
    subject: 'Recuperação de password — Chi Sublime',
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
  return sendEmail({ to: params.to, subject: 'Confirma o teu email — Chi Sublime', html, text });
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
}): Promise<SendEmailResult> {
  const node = createElement(BookingConfirmationEmail, {
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
    subject: `Reserva confirmada · ${params.bookingNumber} — Chi Sublime`,
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
    subject: `Lembrete da tua reserva · ${params.bookingNumber} — Chi Sublime`,
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
}): Promise<SendEmailResult> {
  const node = createElement(BookingCancellationEmail, {
    name: params.name,
    bookingNumber: params.bookingNumber,
    date: params.date,
    time: params.time,
    reason: params.reason,
    rebookUrl: `${APP_URL}/reservar`,
  });
  const { html, text } = await renderEmail(node);
  return sendEmail({
    to: params.to,
    subject: `Reserva cancelada · ${params.bookingNumber} — Chi Sublime`,
    html,
    text,
  });
}

// ============================================================
// Faturação
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
    subject: `O teu documento ${params.documentNumber} — Chi Sublime`,
    html,
    text,
  });
}
