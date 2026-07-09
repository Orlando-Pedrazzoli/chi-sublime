// 📄 src/lib/invoicing/index.ts
/**
 * Chi Sublime — Faturação: factory + barrel
 * ============================================================
 *
 * getInvoiceProvider(id) devolve a implementação certa para o
 * invoiceProvider das FiscalSettings. Só o Mock está ligado; os
 * providers reais (Moloni/InvoiceXpress/…) entram nas próximas
 * batches e registam-se aqui.
 *
 * Este módulo é puro (não toca na base de dados) — a action é que lê
 * as settings e passa o id para cá.
 */

import type { InvoiceProviderId } from '@/lib/models';
import { InvoiceProviderError, type InvoiceProvider } from './InvoiceProvider';
import { MockProvider } from './MockProvider';

export function getInvoiceProvider(id: InvoiceProviderId): InvoiceProvider {
  switch (id) {
    case 'mock':
      return new MockProvider();
    case 'moloni':
    case 'invoicexpress':
    case 'vendus':
    case 'atura':
      throw new InvoiceProviderError(
        'provider_not_implemented',
        `Provider de faturação "${id}" ainda não está implementado. Usa "mock" nas definições fiscais por agora.`,
        false,
      );
    default:
      throw new InvoiceProviderError(
        'provider_unknown',
        `Provider de faturação desconhecido: "${id}"`,
        false,
      );
  }
}

export { MockProvider } from './MockProvider';
export {
  InvoiceProviderError,
  type InvoiceProvider,
  type InvoiceDocumentType,
  type InvoiceCustomer,
  type InvoiceLineInput,
  type IssueInvoiceParams,
  type IssuedInvoiceResult,
} from './InvoiceProvider';
