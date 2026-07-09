// 📄 src/lib/invoicing/MockProvider.ts
/**
 * Chi Sublime — MockProvider (faturação de desenvolvimento)
 * ============================================================
 *
 * Implementa InvoiceProvider sem chamar nenhum serviço externo.
 * Devolve dados com a FORMA de um documento real (documentNumber,
 * série, ATCUD, PDF, etc.) para que todo o fluxo — action → persistir
 * invoiceData → email/PDF — funcione ponta-a-ponta antes de ligar um
 * provider certificado.
 *
 * NÃO é válido fiscalmente. O `certificationNumber` e o QR são
 * placeholders. Trocar para Moloni/InvoiceXpress é só implementar
 * outra classe com esta mesma interface.
 */

import type { InvoiceProvider, IssueInvoiceParams, IssuedInvoiceResult } from './InvoiceProvider';

function randomToken(len = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export class MockProvider implements InvoiceProvider {
  readonly id = 'mock' as const;

  async issueInvoice(params: IssueInvoiceParams): Promise<IssuedInvoiceResult> {
    const now = new Date();
    const year = now.getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    const series = 'MOCK';
    const externalDocumentId = `mock_${now.getTime()}_${randomToken(6)}`;

    return {
      provider: 'mock',
      certificationNumber: '0000/AT (MOCK — sem validade fiscal)',
      externalDocumentId,
      documentNumber: `${params.documentType} ${series}/${year}/${seq}`,
      series,
      atcud: `MOCK-${randomToken(8)}`,
      documentType: params.documentType,
      // Placeholder — o PDF real é gerado na Batch de PDF (ou pelo provider).
      pdfUrl: `https://invoices.mock.local/${externalDocumentId}.pdf`,
      qrCodeUrl: undefined,
      issuedAt: now,
      raw: {
        mock: true,
        reference: params.internalReference,
        totalWithVat: params.totalWithVat,
        currency: params.currency,
        lineCount: params.lines.length,
      },
    };
  }
}
