// 📄 src/lib/invoicing/MoloniProvider.ts
/**
 * Chi Sublime — Provider de faturação: Moloni (API v1)
 * ============================================================
 *
 * Emite FATURA-RECIBO (FR) — venda paga no ato, o documento típico de
 * um salão. Segue a especificação de invoiceReceipts/insert
 * (https://www.moloni.pt/dev/documents/invoice-receipts/insert/):
 *
 *   obrigatórios: company_id, date, expiration_date, document_set_id,
 *                 customer_id, products[{ product_id, name, qty, price }],
 *                 payments[{ payment_method_id, date, value }]
 *   isenção:      products[].exemption_reason obrigatório quando taxes
 *                 está vazio (regime do art. 53.º → "M10-1")
 *   status:       1 = fechado (certificado e comunicado à AT); 0 = rascunho
 *
 * Fluxo:
 *   1. Token + companyId (MoloniAuth, cache no FiscalSettings)
 *   2. Cliente: NIF → getByVat ou insert; sem NIF → Consumidor Final
 *   3. Artigos: product_id de cada serviço (cria/sincroniza se faltar)
 *   4. insert (status 1) → getOne (número/série/total) → getPDFLink
 *
 * Configuração: scripts/moloni-setup.ts preenche FiscalSettings.moloni.
 */

import { getFiscalSettings, type IFiscalSettings, type PaymentMethod } from '@/lib/models';
import {
  InvoiceProviderError,
  type InvoiceCustomer,
  type InvoiceProvider,
  type IssueInvoiceParams,
  type IssuedInvoiceResult,
} from './InvoiceProvider';
import { getMoloniAccessToken } from './MoloniAuth';
import {
  centsToMoloni,
  moloniCall,
  moloniDate,
  moloniDateTime,
  MoloniApiError,
  type MoloniObj,
} from './moloni-client';
import {
  ensureGenericProduct,
  ensureServiceProduct,
  moloniTaxFields,
  type MoloniContext,
} from './moloni-catalog';

const CONSUMIDOR_FINAL_VAT = '999999990';
const PT_COUNTRY_ID = 1;
const PT_LANGUAGE_ID = 1;

/** Certificado AT do software Moloni (≤ 30 caracteres — limite do schema). */
const MOLONI_CERTIFICATION = 'Moloni — Certificado AT 2860';

function wrap(err: unknown, code: string, retryable: boolean): InvoiceProviderError {
  if (err instanceof InvoiceProviderError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new InvoiceProviderError(code, `Moloni: ${message}`, retryable);
}

function paymentMethodId(settings: IFiscalSettings, method: PaymentMethod): number {
  const m = settings.moloni ?? ({} as IFiscalSettings['moloni']);
  const id = m.paymentMethods?.[method] ?? m.defaultPaymentMethodId ?? m.paymentMethods?.cash;
  if (!id) {
    throw new InvoiceProviderError(
      'moloni_no_payment_method',
      `Meio de pagamento "${method}" sem correspondência na Moloni (moloni.paymentMethods). Corre scripts/moloni-setup.ts.`,
      false,
    );
  }
  return id;
}

async function resolveCustomerId(
  ctx: MoloniContext,
  customer: InvoiceCustomer,
  fallbackPaymentMethodId: number,
): Promise<number> {
  const cfg = ctx.settings.moloni;
  const vat = customer.vatNumber?.replace(/\D/g, '');

  if (!vat || vat === CONSUMIDOR_FINAL_VAT) {
    if (!cfg?.consumidorFinalCustomerId) {
      throw new InvoiceProviderError(
        'moloni_no_customer',
        'Venda sem NIF mas sem consumidorFinalCustomerId configurado. Corre scripts/moloni-setup.ts.',
        false,
      );
    }
    return cfg.consumidorFinalCustomerId;
  }

  const found = await moloniCall<MoloniObj[]>('customers/getByVat', ctx.accessToken, {
    company_id: ctx.companyId,
    vat,
  });
  if (Array.isArray(found) && found[0]?.customer_id) return Number(found[0].customer_id);

  if (!cfg?.defaultMaturityDateId) {
    throw new InvoiceProviderError(
      'moloni_no_maturity',
      'Prazo de vencimento por defeito em falta (moloni.defaultMaturityDateId). Corre scripts/moloni-setup.ts.',
      false,
    );
  }

  const zip = customer.postalCode?.trim();
  const inserted = await moloniCall<MoloniObj>('customers/insert', ctx.accessToken, {
    company_id: ctx.companyId,
    vat,
    // O NIF é único por cliente — serve de código (máx. 20)
    number: vat,
    name: customer.name.trim().slice(0, 200) || 'Cliente',
    language_id: PT_LANGUAGE_ID,
    address: customer.address?.trim() || 'Desconhecido',
    zip_code: zip && /^\d{4}-\d{3}$/.test(zip) ? zip : '',
    city: customer.city?.trim() || 'Desconhecido',
    country_id: PT_COUNTRY_ID,
    email: customer.email?.trim() || '',
    maturity_date_id: cfg.defaultMaturityDateId,
    payment_method_id: fallbackPaymentMethodId,
    salesman_id: 0,
    payment_day: 0,
    discount: 0,
    credit_limit: 0,
    delivery_method_id: 0,
  });
  if (!inserted?.customer_id) {
    throw new InvoiceProviderError(
      'moloni_customer',
      'Não foi possível criar o cliente na Moloni (sem customer_id).',
      false,
    );
  }
  return Number(inserted.customer_id);
}

export class MoloniProvider implements InvoiceProvider {
  readonly id = 'moloni' as const;

  async issueInvoice(params: IssueInvoiceParams): Promise<IssuedInvoiceResult> {
    if (params.documentType !== 'FR') {
      throw new InvoiceProviderError(
        'moloni_doctype_unsupported',
        `Tipo de documento "${params.documentType}" ainda não implementado no MoloniProvider (só Fatura-Recibo).`,
        false,
      );
    }
    if (params.lines.length === 0) {
      throw new InvoiceProviderError('moloni_no_lines', 'Documento sem linhas.', false);
    }

    // ── Contexto ────────────────────────────────────────────
    const [{ accessToken, companyId }, settings] = await Promise.all([
      getMoloniAccessToken(),
      getFiscalSettings(),
    ]);
    const cfg = settings.moloni;
    if (!cfg?.defaultDocumentSetId) {
      throw new InvoiceProviderError(
        'moloni_no_document_set',
        'Série (moloni.defaultDocumentSetId) em falta. Corre scripts/moloni-setup.ts.',
        false,
      );
    }
    const ctx: MoloniContext = { accessToken, companyId, settings };
    const payMethodId = paymentMethodId(settings, params.paymentMethod);
    const now = new Date();
    const status = params.forceDraft ? 0 : 1;

    // ── Cliente + artigos (erros aqui são seguros de re-tentar) ─
    let customerId: number;
    let products: MoloniObj[];
    try {
      customerId = await resolveCustomerId(ctx, params.customer, payMethodId);
      products = [];
      for (const [index, line] of params.lines.entries()) {
        const productId = line.serviceId
          ? await ensureServiceProduct(ctx, line.serviceId)
          : await ensureGenericProduct(ctx, line.vatRate);
        products.push({
          product_id: productId,
          name: line.name.slice(0, 200),
          summary: '',
          qty: line.quantity,
          price: centsToMoloni(line.unitPriceNet),
          discount: line.discountPercent ?? 0,
          order: index,
          ...moloniTaxFields(settings, line.vatRate),
        });
      }
    } catch (err) {
      throw wrap(err, 'moloni_prepare_failed', err instanceof MoloniApiError);
    }

    // ── Emissão ─────────────────────────────────────────────
    let documentId: number;
    let inserted: MoloniObj;
    try {
      inserted = await moloniCall<MoloniObj>('invoiceReceipts/insert', accessToken, {
        company_id: companyId,
        date: moloniDate(now),
        expiration_date: moloniDate(now),
        document_set_id: cfg.defaultDocumentSetId,
        customer_id: customerId,
        your_reference: params.internalReference.slice(0, 60),
        products,
        payments: [
          {
            payment_method_id: payMethodId,
            date: moloniDateTime(now),
            value: centsToMoloni(params.totalWithVat),
            notes: '',
          },
        ],
        notes: '',
        status,
      });
      documentId = Number(inserted?.document_id);
      if (!documentId) {
        throw new MoloniApiError('invoiceReceipts/insert', 'resposta sem document_id', inserted);
      }
    } catch (err) {
      // Erro de validação → nada foi criado, pode corrigir e re-tentar.
      // Erro de rede → estado desconhecido: NÃO re-tentar sem confirmar na Moloni.
      const validation = err instanceof MoloniApiError && err.details !== undefined;
      throw wrap(err, validation ? 'moloni_insert_invalid' : 'moloni_insert_unknown', false);
    }

    // ── Pós-emissão (o documento JÁ existe — nunca lançar daqui) ─
    let one: MoloniObj | null = null;
    let pdfUrl = '';
    try {
      one = await moloniCall<MoloniObj>('invoiceReceipts/getOne', accessToken, {
        company_id: companyId,
        document_id: documentId,
      });
    } catch (err) {
      console.error('[MoloniProvider] getOne falhou para', documentId, err);
    }
    if (status === 1) {
      try {
        const pdf = await moloniCall<MoloniObj>('documents/getPDFLink', accessToken, {
          company_id: companyId,
          document_id: documentId,
        });
        pdfUrl = typeof pdf?.url === 'string' ? pdf.url : '';
      } catch (err) {
        console.error('[MoloniProvider] getPDFLink falhou para', documentId, err);
      }
    }

    // Conferência de totais (a Moloni calcula; avisamos se divergir)
    const moloniTotal = Number(one?.net_value ?? one?.gross_value ?? NaN);
    if (
      Number.isFinite(moloniTotal) &&
      Math.abs(moloniTotal - centsToMoloni(params.totalWithVat)) > 0.01
    ) {
      console.warn(
        `[MoloniProvider] total divergente em ${documentId}: Moloni ${moloniTotal} vs Chi ${centsToMoloni(params.totalWithVat)}`,
      );
    }

    const series = String(
      one?.document_set_name ?? one?.document_set?.name ?? cfg.documentSetName ?? 'M',
    );
    const number = one?.number ? String(one.number) : null;
    const documentNumber =
      status === 0 ? `RASCUNHO ${documentId}` : `FR ${series}/${number ?? documentId}`;

    return {
      provider: 'moloni',
      certificationNumber: MOLONI_CERTIFICATION,
      externalDocumentId: String(documentId),
      documentNumber,
      series,
      // O ATCUD vem impresso no PDF; se a API não o devolver guardamos o nº do documento
      atcud: String(one?.atcud ?? one?.at_code ?? documentNumber),
      documentType: 'FR',
      pdfUrl: pdfUrl || `https://www.moloni.pt/${settings.vatNumber}/Documentos/`,
      issuedAt: now,
      draft: status === 0,
      raw: { insert: inserted, one },
    };
  }
}
