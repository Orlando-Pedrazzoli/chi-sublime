// 📄 src/lib/invoicing/InvoiceProvider.ts
/**
 * Chi Sublime — Contrato de Provider de Faturação
 * ============================================================
 *
 * Interface agnóstica que qualquer provider certificado (Moloni,
 * InvoiceXpress, Vendus…) ou o MockProvider tem de implementar.
 *
 * O orquestrador (issueInvoiceAction) só fala com esta interface —
 * trocar de provider é trocar a implementação, sem mexer na action
 * nem no fluxo. Todos os valores monetários em CÊNTIMOS.
 */

import type { InvoiceProviderId } from '@/lib/models';

export type InvoiceDocumentType = 'FT' | 'FR' | 'FS' | 'NC' | 'ND';

/** Adquirente (snapshot fiscal no momento da emissão). */
export interface InvoiceCustomer {
  name: string;
  vatNumber?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: string;
}

/** Linha do documento. `unitPriceNet` é líquido, em cêntimos. */
export interface InvoiceLineInput {
  name: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  discountPercent?: number;
}

/** Tudo o que o provider precisa para emitir um documento. */
export interface IssueInvoiceParams {
  documentType: InvoiceDocumentType;
  customer: InvoiceCustomer;
  lines: InvoiceLineInput[];
  /** Totais já calculados (cêntimos), para o provider validar/conferir. */
  totalNet: number;
  totalVat: number;
  totalWithVat: number;
  currency: string;
  /** Referência interna (transactionNumber) para rastreio. */
  internalReference: string;
  notes?: string;
}

/** Resultado normalizado de uma emissão bem-sucedida. */
export interface IssuedInvoiceResult {
  provider: InvoiceProviderId;
  certificationNumber: string;
  externalDocumentId: string;
  documentNumber: string;
  series: string;
  atcud: string;
  documentType: InvoiceDocumentType;
  pdfUrl: string;
  qrCodeUrl?: string;
  issuedAt: Date;
  /** Resposta bruta do provider, para o campo apiResponseLog. */
  raw?: unknown;
}

/** Contrato do provider. Mais métodos (nota de crédito) entram depois. */
export interface InvoiceProvider {
  readonly id: InvoiceProviderId;
  issueInvoice(params: IssueInvoiceParams): Promise<IssuedInvoiceResult>;
}

/**
 * Erro tipado do provider. `retryable` alimenta o invoiceError do
 * Transaction (permite re-tentar sem intervenção manual).
 */
export class InvoiceProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'InvoiceProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}
