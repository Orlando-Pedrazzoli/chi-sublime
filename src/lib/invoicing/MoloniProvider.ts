// 📄 src/lib/invoicing/MoloniProvider.ts
/**
 * Chi Sublime — Provider de faturação: Moloni (API v1)
 * ============================================================
 *
 * Implementa InvoiceProvider contra a API clássica do Moloni.
 * Emite FATURA-RECIBO (FR) — o documento típico de um salão: venda
 * paga no momento. Fluxo:
 *   1. Autentica (MoloniAuth) → access_token + companyId.
 *   2. Resolve o cliente: por NIF (getByVat) ou cria (insert); sem
 *      NIF usa o consumidorFinalCustomerId configurado.
 *   3. Mapeia as linhas → products[] com o IVA (tax_id).
 *   4. invoiceReceipts/insert com status=1 (fecha/certifica). O
 *      pagamento é adicionado automaticamente pelo Moloni.
 *   5. Lê número/série (getOne) e o link do PDF (getPDFLink).
 *
 * CONFIGURAÇÃO NECESSÁRIA no FiscalSettings.moloni (IDs da conta):
 *   companyId, defaultDocumentSetId (série), vatTaxId (imposto 23%),
 *   consumidorFinalCustomerId (cliente genérico para vendas sem NIF).
 *
 * Notas honestas:
 *   - Só o tipo FR está implementado; FT/FS/NC lançam erro claro
 *     (entram depois se precisares).
 *   - Uma taxa de IVA por conta (vatTaxId). Salão = 23% regime geral.
 *   - Precisa de teste real contra o sandbox do Moloni antes de prod.
 */

import { getFiscalSettings } from '@/lib/models';
import {
  InvoiceProviderError,
  type InvoiceCustomer,
  type InvoiceProvider,
  type IssueInvoiceParams,
  type IssuedInvoiceResult,
} from './InvoiceProvider';
import { getMoloniAccessToken, MOLONI_BASE_URL } from './MoloniAuth';

const CONSUMIDOR_FINAL_VAT = '999999990';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Chamada genérica à API Moloni (POST JSON). */
async function callMoloni(
  endpoint: string,
  accessToken: string,
  body: Record<string, any>,
): Promise<any> {
  const url = `${MOLONI_BASE_URL}${endpoint}/?access_token=${encodeURIComponent(
    accessToken,
  )}&json=true&human_errors=1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Deteta a forma de erro do Moloni e devolve uma mensagem legível (ou null). */
function moloniErrorMessage(data: any): string | null {
  if (!data) return 'Resposta vazia do Moloni';
  if (Array.isArray(data)) {
    // getByVat devolve array de clientes — não é erro.
    return null;
  }
  if (data.error || data.errors) {
    try {
      return JSON.stringify(data.error ?? data.errors);
    } catch {
      return 'Erro do Moloni';
    }
  }
  return null;
}

function toEuros(cents: number): number {
  return Number((cents / 100).toFixed(4));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Resolve (ou cria) o customer_id no Moloni. */
async function resolveCustomerId(
  accessToken: string,
  companyId: number,
  customer: InvoiceCustomer,
  cfg: any,
): Promise<number> {
  const vat = customer.vatNumber?.trim();

  if (vat && vat !== CONSUMIDOR_FINAL_VAT) {
    const found = await callMoloni('customers/getByVat', accessToken, {
      company_id: companyId,
      vat,
    });
    if (Array.isArray(found) && found.length > 0 && found[0]?.customer_id) {
      return Number(found[0].customer_id);
    }

    const inserted = await callMoloni('customers/insert', accessToken, {
      company_id: companyId,
      vat,
      number: `C${Date.now()}`,
      name: customer.name,
      email: customer.email || '',
      address: customer.address || 'Desconhecido',
      city: customer.city || customer.country || 'Desconhecido',
      zip_code: customer.postalCode || '0000-000',
      country_id: 1, // Portugal
      language_id: 1, // Português
    });
    const err = moloniErrorMessage(inserted);
    if (err || !inserted?.customer_id) {
      throw new InvoiceProviderError(
        'moloni_customer',
        `Não foi possível criar o cliente no Moloni: ${err ?? 'sem customer_id na resposta'}`,
        false,
      );
    }
    return Number(inserted.customer_id);
  }

  // Sem NIF → consumidor final
  if (cfg?.consumidorFinalCustomerId) {
    return Number(cfg.consumidorFinalCustomerId);
  }
  throw new InvoiceProviderError(
    'moloni_no_customer',
    'Venda sem NIF mas sem consumidorFinalCustomerId configurado em FiscalSettings.moloni.',
    false,
  );
}

export class MoloniProvider implements InvoiceProvider {
  readonly id = 'moloni' as const;

  async issueInvoice(params: IssueInvoiceParams): Promise<IssuedInvoiceResult> {
    if (params.documentType !== 'FR') {
      throw new InvoiceProviderError(
        'moloni_doctype_unsupported',
        `Tipo de documento "${params.documentType}" ainda não implementado no MoloniProvider (só FR por agora).`,
        false,
      );
    }

    const { accessToken, companyId } = await getMoloniAccessToken();
    const settings = await getFiscalSettings();
    const cfg = (settings as any).moloni ?? {};

    if (!cfg.defaultDocumentSetId) {
      throw new InvoiceProviderError(
        'moloni_no_document_set',
        'defaultDocumentSetId (série) em falta em FiscalSettings.moloni.',
        false,
      );
    }
    if (!cfg.vatTaxId) {
      throw new InvoiceProviderError(
        'moloni_no_tax',
        'vatTaxId (imposto IVA) em falta em FiscalSettings.moloni.',
        false,
      );
    }

    const customerId = await resolveCustomerId(accessToken, companyId, params.customer, cfg);

    const products = params.lines.map((line) => {
      const exempt = line.vatRate <= 0;
      return {
        name: line.name,
        qty: line.quantity,
        price: toEuros(line.unitPriceNet),
        discount: line.discountPercent ?? 0,
        taxes: exempt ? [] : [{ tax_id: Number(cfg.vatTaxId), order: 1, cumulative: 0 }],
        ...(exempt ? { exemption_reason: settings.vatExemptionReason || 'M99' } : {}),
      };
    });

    const insertBody: Record<string, any> = {
      company_id: companyId,
      customer_id: customerId,
      document_set_id: Number(cfg.defaultDocumentSetId),
      date: isoDate(new Date()),
      status: 1, // 1 = fechado/certificado
      your_reference: params.internalReference,
      notes: params.notes || '',
      products,
    };

    const inserted = await callMoloni('invoiceReceipts/insert', accessToken, insertBody);
    const insertErr = moloniErrorMessage(inserted);
    const documentId = inserted?.document_id ?? inserted?.insertId ?? inserted?.id;
    if (insertErr || !documentId) {
      throw new InvoiceProviderError(
        'moloni_insert_failed',
        `Falha ao emitir fatura-recibo no Moloni: ${insertErr ?? 'sem document_id na resposta'}`,
        true,
      );
    }

    // Detalhes (número/série) e PDF
    const one = await callMoloni('invoiceReceipts/getOne', accessToken, {
      company_id: companyId,
      document_id: documentId,
    });
    const pdf = await callMoloni('documents/getPDFLink', accessToken, {
      company_id: companyId,
      document_id: documentId,
      signed: 1,
    });

    const setName: string = one?.document_set?.name ?? String(cfg.defaultDocumentSetId);
    const number: string | number = one?.number ?? documentId;
    const documentNumber = `${setName}/${number}`;
    const atcud: string = one?.atcud || documentNumber;
    const pdfUrl: string = pdf?.url || '';

    if (!pdfUrl) {
      // Não falha a emissão — o documento já existe; só regista.
      console.warn('[MoloniProvider] getPDFLink sem url para document_id', documentId);
    }

    return {
      provider: 'moloni',
      certificationNumber: 'Processado por programa certificado (Moloni)',
      externalDocumentId: String(documentId),
      documentNumber,
      series: setName,
      atcud,
      documentType: 'FR',
      pdfUrl: pdfUrl || `${MOLONI_BASE_URL}documents/getPDFLink (document_id=${documentId})`,
      issuedAt: new Date(),
      raw: { insert: inserted, one, pdf },
    };
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
