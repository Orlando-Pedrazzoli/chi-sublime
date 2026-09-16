// 📄 src/lib/invoicing/moloni-catalog.ts
/**
 * Chi Sublime — Catálogo Moloni (serviços ↔ artigos)
 * ============================================================
 *
 * A API exige um `product_id` em cada linha de documento
 * (invoiceReceipts/insert → products[].product_id obrigatório), por isso
 * cada serviço do salão tem de existir como ARTIGO na Moloni.
 *
 * Regras de criação (products/insert):
 *   - type 2 (Serviço), sem stock
 *   - reference única: "SRV-" + slug (máx. 30)
 *   - regime de isenção → taxes [] + exemption_reason (ex.: "M10-1")
 *   - regime normal     → taxes [{ tax_id do IVA da taxa do serviço }]
 *
 * O `moloniProductId` fica guardado no Service. Se o artigo tiver sido
 * apagado na Moloni, é recriado/relocalizado pela referência.
 */

import { Service, type IFiscalSettings, isVatExemptRegime } from '@/lib/models';
import { InvoiceProviderError } from './InvoiceProvider';
import { centsToMoloni, moloniCall, MoloniApiError, type MoloniObj } from './moloni-client';

export const GENERIC_PRODUCT_REFERENCE = 'SRV-GERAL';

export type MoloniContext = {
  accessToken: string;
  companyId: number;
  settings: IFiscalSettings;
};

export function serviceReference(slug: string): string {
  const clean = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `SRV-${clean}`.slice(0, 30);
}

function taxIdForRate(settings: IFiscalSettings, rate: number): number | undefined {
  const t = settings.moloni?.taxIds ?? {};
  if (rate === 23) return t.vat_23 ?? settings.moloni?.vatTaxId;
  if (rate === 13) return t.vat_13;
  if (rate === 6) return t.vat_6;
  return undefined;
}

/** `taxes` + `exemption_reason` de uma linha/artigo, segundo o regime. */
export function moloniTaxFields(
  settings: IFiscalSettings,
  vatRate: number,
): { taxes: MoloniObj[]; exemption_reason?: string } {
  if (isVatExemptRegime(settings) || vatRate <= 0) {
    const reason = settings.vatExemptionReason?.trim();
    if (!reason) {
      throw new InvoiceProviderError(
        'moloni_no_exemption_reason',
        'Linha sem IVA mas sem motivo de isenção configurado (FiscalSettings.vatExemptionReason). Corre scripts/moloni-setup.ts.',
        false,
      );
    }
    return { taxes: [], exemption_reason: reason };
  }
  const taxId = taxIdForRate(settings, vatRate);
  if (!taxId) {
    throw new InvoiceProviderError(
      'moloni_no_tax',
      `Sem imposto Moloni configurado para IVA ${vatRate}% (FiscalSettings.moloni.taxIds).`,
      false,
    );
  }
  return { taxes: [{ tax_id: taxId, value: vatRate, order: 1, cumulative: 0 }] };
}

function requireCatalogConfig(settings: IFiscalSettings) {
  const categoryId = settings.moloni?.productCategoryId;
  const unitId = settings.moloni?.unitId;
  if (!categoryId || !unitId) {
    throw new InvoiceProviderError(
      'moloni_catalog_not_configured',
      'Categoria/unidade dos artigos Moloni em falta (moloni.productCategoryId / unitId). Corre scripts/moloni-setup.ts.',
      false,
    );
  }
  return { categoryId, unitId };
}

async function findProductByReference(
  ctx: MoloniContext,
  reference: string,
): Promise<MoloniObj | null> {
  const found = await moloniCall<MoloniObj[]>('products/getByReference', ctx.accessToken, {
    company_id: ctx.companyId,
    reference,
    exact: 1,
  });
  return Array.isArray(found)
    ? (found.find((p) => String(p.reference).toUpperCase() === reference.toUpperCase()) ?? null)
    : null;
}

type ProductInput = { reference: string; name: string; priceCents: number; vatRate: number };

/** Cria ou atualiza o artigo e devolve o product_id. */
export async function upsertMoloniProduct(
  ctx: MoloniContext,
  input: ProductInput,
  knownProductId?: number,
): Promise<{ productId: number; action: 'created' | 'updated' }> {
  const { categoryId, unitId } = requireCatalogConfig(ctx.settings);
  const payload: MoloniObj = {
    company_id: ctx.companyId,
    category_id: categoryId,
    type: 2,
    name: input.name.slice(0, 200),
    summary: '',
    reference: input.reference,
    ean: '',
    price: centsToMoloni(input.priceCents),
    unit_id: unitId,
    has_stock: 0,
    stock: 0,
    ...moloniTaxFields(ctx.settings, input.vatRate),
  };

  let productId = knownProductId;
  if (!productId) {
    const existing = await findProductByReference(ctx, input.reference);
    if (existing?.product_id) productId = Number(existing.product_id);
  }

  if (productId) {
    try {
      await moloniCall('products/update', ctx.accessToken, { ...payload, product_id: productId });
      return { productId, action: 'updated' };
    } catch (err) {
      // product_id guardado mas apagado na Moloni → procurar pela referência / recriar
      if (!(err instanceof MoloniApiError) || knownProductId === undefined) throw err;
      const existing = await findProductByReference(ctx, input.reference);
      if (existing?.product_id) {
        await moloniCall('products/update', ctx.accessToken, {
          ...payload,
          product_id: Number(existing.product_id),
        });
        return { productId: Number(existing.product_id), action: 'updated' };
      }
    }
  }

  const inserted = await moloniCall<MoloniObj>('products/insert', ctx.accessToken, payload);
  if (!inserted?.product_id) {
    throw new MoloniApiError('products/insert', 'resposta sem product_id', inserted);
  }
  return { productId: Number(inserted.product_id), action: 'created' };
}

/** Garante o artigo de um serviço e guarda o moloniProductId. */
export async function ensureServiceProduct(
  ctx: MoloniContext,
  serviceId: string,
  opts: { forceUpdate?: boolean } = {},
): Promise<number> {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new InvoiceProviderError(
      'moloni_service_missing',
      `Serviço ${serviceId} não encontrado`,
      false,
    );
  }
  if (service.moloniProductId && !opts.forceUpdate) return service.moloniProductId;

  const { productId } = await upsertMoloniProduct(
    ctx,
    {
      reference: serviceReference(service.slug),
      name: service.name.pt,
      priceCents: service.price,
      vatRate: service.vatRate,
    },
    service.moloniProductId,
  );

  if (service.moloniProductId !== productId) {
    await Service.updateOne({ _id: service._id }, { $set: { moloniProductId: productId } });
  }
  return productId;
}

/** Artigo genérico para linhas sem serviço associado (ex.: venda avulsa). */
export async function ensureGenericProduct(ctx: MoloniContext, vatRate: number): Promise<number> {
  const existing = await findProductByReference(ctx, GENERIC_PRODUCT_REFERENCE);
  if (existing?.product_id) return Number(existing.product_id);
  const { productId } = await upsertMoloniProduct(ctx, {
    reference: GENERIC_PRODUCT_REFERENCE,
    name: 'Serviço de cabeleireiro e estética',
    priceCents: 0,
    vatRate,
  });
  return productId;
}
