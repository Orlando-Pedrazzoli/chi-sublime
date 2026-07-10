// 📄 src/lib/pdf/templates/_theme.ts
/**
 * Chi Sublime — Tema partilhado dos PDFs (@react-pdf/renderer)
 * ============================================================
 *
 * Cores da marca, formatadores (dinheiro/data em pt-PT) e o mapa de
 * métodos de pagamento. Usado pelos templates Receipt/FinancialReport/
 * CashRegisterReport. Todos os valores em CÊNTIMOS.
 */

export const pdfColors = {
  green: '#1f3d2e',
  gold: '#b8924a',
  cream: '#faf7f2',
  sand: '#efe9dd',
  ink: '#2b2b2b',
  muted: '#6a6a6a',
  line: '#d8d2c4',
  red: '#b23c3c',
} as const;

export function fmtMoney(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function fmtDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Numerário',
  card_terminal: 'Terminal (TPA)',
  mb_way: 'MB WAY',
  multibanco: 'Multibanco',
  transfer: 'Transferência',
  other: 'Outro',
};

export function paymentLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
