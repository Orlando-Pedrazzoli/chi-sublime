import { Resend } from 'resend';

// ============================================================================
// Configuração
// ============================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'reservas@chisublime.pt';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const isMockMode = !RESEND_API_KEY || RESEND_API_KEY.length === 0;

const resend: Resend | null = isMockMode ? null : new Resend(RESEND_API_KEY);

// ============================================================================
// Tipos
// ============================================================================

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  mocked?: boolean;
}

// ============================================================================
// Helpers de URL (centralizados para evitar typos)
// ============================================================================

export function getResetPasswordUrl(token: string): string {
  return `${APP_URL}/redefinir-password?token=${encodeURIComponent(token)}`;
}

export function getBookingDetailUrl(bookingNumber: string): string {
  return `${APP_URL}/conta/reservas/${encodeURIComponent(bookingNumber)}`;
}

// ============================================================================
// Função principal
// ============================================================================

/**
 * Envia um email. Em dev (sem RESEND_API_KEY) faz mock e loga no console.
 *
 * Best practice: nunca lança exceção em mock mode — devolve sempre resultado
 * estruturado para o caller decidir o que fazer.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, html, text } = input;

  if (isMockMode) {
    logMockEmail({ to, subject, html, text });
    return { ok: true, mocked: true };
  }

  try {
    const result = await resend!.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
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

// ============================================================================
// Templates específicos
// ============================================================================

/**
 * Envia email de recuperação de password com link mágico.
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
}): Promise<SendEmailResult> {
  const url = getResetPasswordUrl(params.token);

  return sendEmail({
    to: params.to,
    subject: 'Recuperação de password — Chi Sublime',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1F3D2E;">Olá ${escapeHtml(params.name)},</h2>
        <p>Recebemos um pedido para redefinir a tua password no Chi Sublime.</p>
        <p>Clica no botão abaixo para criares uma nova password:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${url}"
             style="background: #1F3D2E; color: #FAF7F2; padding: 14px 32px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Redefinir password
          </a>
        </p>
        <p style="color: #5A5A5A; font-size: 14px;">
          Se não pediste esta recuperação, ignora este email. O link expira em 1 hora.
        </p>
        <hr style="border: none; border-top: 1px solid #EFE9DD; margin: 32px 0;" />
        <p style="color: #5A5A5A; font-size: 12px; text-align: center;">
          Chi Sublime — Hair Style & Beauty<br/>
          Quinta da Bicuda, Cascais
        </p>
      </div>
    `,
  });
}

/**
 * Envia email de confirmação de reserva.
 */
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
  const url = getBookingDetailUrl(params.bookingNumber);

  return sendEmail({
    to: params.to,
    subject: `Reserva confirmada · ${params.bookingNumber} — Chi Sublime`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1F3D2E;">Reserva confirmada</h2>
        <p>Olá ${escapeHtml(params.name)}, obrigado pela tua reserva.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Número</td><td style="padding: 8px 0;"><strong>${escapeHtml(params.bookingNumber)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Data</td><td style="padding: 8px 0;">${escapeHtml(params.date)}</td></tr>
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Hora</td><td style="padding: 8px 0;">${escapeHtml(params.time)}</td></tr>
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Serviços</td><td style="padding: 8px 0;">${escapeHtml(params.services)}</td></tr>
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Profissional</td><td style="padding: 8px 0;">${escapeHtml(params.staffName)}</td></tr>
          <tr><td style="padding: 8px 0; color: #5A5A5A;">Total</td><td style="padding: 8px 0;"><strong>${escapeHtml(params.total)}</strong></td></tr>
        </table>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${url}"
             style="background: #1F3D2E; color: #FAF7F2; padding: 14px 32px;
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Ver detalhes da reserva
          </a>
        </p>
        <p style="color: #5A5A5A; font-size: 14px;">
          Morada: Rua Estorninho, Loja E, Quinta da Bicuda, 2750-686 Cascais<br/>
          Telefone: +351 932 932 691
        </p>
      </div>
    `,
  });
}

// ============================================================================
// Mock logging
// ============================================================================

function logMockEmail(input: SendEmailInput): void {
  const separator = '═'.repeat(72);
  const lines = [
    '',
    `\x1b[36m${separator}\x1b[0m`,
    '\x1b[36m📧  EMAIL MOCK (Resend desactivado — config RESEND_API_KEY para envio real)\x1b[0m',
    `\x1b[36m${separator}\x1b[0m`,
    `   To:      ${input.to}`,
    `   Subject: ${input.subject}`,
    '',
    extractActionableUrl(input.html),
    `\x1b[36m${separator}\x1b[0m`,
    '',
  ];
  console.log(lines.filter(Boolean).join('\n'));
}

/**
 * Extrai e destaca o link principal do HTML (botão de acção).
 * Facilita encontrar o URL no terminal.
 */
function extractActionableUrl(html: string): string {
  const match = html.match(/href="([^"]+)"/);
  if (!match) return '   (sem link no email)';
  return `   \x1b[33m🔗 Link:   ${match[1]}\x1b[0m`;
}

// ============================================================================
// Utilitários
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
