// 📄 src/lib/email/resend.ts
/**
 * Chi Sublime — Camada de envio (Resend)
 * ============================================================
 *
 * Infraestrutura de email: cliente Resend, configuração, o primitivo
 * `sendEmail` e os helpers de URL. Os senders de alto nível (que
 * renderizam os templates react-email) vivem em `send.ts`.
 *
 * Modo mock: sem RESEND_API_KEY, não envia nada — loga no terminal
 * (com o link de ação destacado) e devolve { ok:true, mocked:true }.
 * Nunca lança; devolve sempre resultado estruturado.
 *
 * Env:
 *   RESEND_API_KEY        chave do Resend (vazio → mock)
 *   RESEND_FROM_EMAIL     remetente (default reservas@chisublime.pt)
 *   NEXT_PUBLIC_APP_URL   base dos links (default localhost:3000)
 */

import { Resend } from 'resend';

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'reservas@chisublime.pt';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const isMockMode = RESEND_API_KEY.length === 0;

const resend: Resend | null = isMockMode ? null : new Resend(RESEND_API_KEY);

// ============================================================
// Tipos
// ============================================================

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  mocked?: boolean;
}

// ============================================================
// Helpers de URL (centralizados para evitar typos)
// ============================================================

export function getResetPasswordUrl(token: string): string {
  return `${APP_URL}/redefinir-password?token=${encodeURIComponent(token)}`;
}

export function getBookingDetailUrl(bookingNumber: string): string {
  return `${APP_URL}/conta/reservas/${encodeURIComponent(bookingNumber)}`;
}

export function getLoginUrl(): string {
  return `${APP_URL}/entrar`;
}

/**
 * Link de verificação de email. NOTA: a rota /verificar-email (page +
 * API) ainda não existe — fica para a Fase 5. O template já a suporta.
 */
export function getVerifyEmailUrl(token: string): string {
  return `${APP_URL}/verificar-email?token=${encodeURIComponent(token)}`;
}

// ============================================================
// Envio
// ============================================================

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo } = input;

  if (isMockMode) {
    logMockEmail({ to, subject, html });
    return { ok: true, mocked: true };
  }

  try {
    const result = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
      replyTo,
    });

    if (result.error) {
      console.error('[email] Resend error:', result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[email] Send failed:', message);
    return { ok: false, error: message };
  }
}

// ============================================================
// Mock logging
// ============================================================

function logMockEmail(input: { to: string | string[]; subject: string; html: string }): void {
  const sep = '═'.repeat(72);
  const to = Array.isArray(input.to) ? input.to.join(', ') : input.to;
  const linkMatch = input.html.match(/href="([^"]+)"/);
  const lines = [
    '',
    `\x1b[36m${sep}\x1b[0m`,
    '\x1b[36m📧  EMAIL MOCK (Resend desativado — define RESEND_API_KEY para envio real)\x1b[0m',
    `\x1b[36m${sep}\x1b[0m`,
    `   To:      ${to}`,
    `   Subject: ${input.subject}`,
    linkMatch ? `   \x1b[33m🔗 Link:   ${linkMatch[1]}\x1b[0m` : '   (sem link no email)',
    `\x1b[36m${sep}\x1b[0m`,
    '',
  ];
  console.log(lines.join('\n'));
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
