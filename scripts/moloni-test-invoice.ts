// 📄 scripts/moloni-test-invoice.ts
/**
 * Chi Sublime — Teste de emissão Moloni em RASCUNHO
 * ============================================================
 *
 * Passa pelo MESMO código da app (MoloniProvider) para validar o pedido
 * completo — cliente, artigos, isenção, pagamento, datas — mas cria a
 * fatura-recibo em RASCUNHO:
 *   - não fica fechada, não tem ATCUD, NÃO é comunicada à AT;
 *   - no fim é apagada (a Moloni só permite apagar rascunhos).
 *
 * USO
 *   npx tsx scripts/moloni-test-invoice.ts
 *   --nif=123456789     testa também a criação/pesquisa de cliente com NIF
 *                       (cria o cliente na Moloni se não existir — não é fiscal)
 *   --payment=mb_way    cash | mb_way | multibanco | card_terminal | transfer
 *   --keep              não apaga o rascunho (para veres na Moloni)
 *   --mongo-uri="..." --db=chi-sublime
 */

import { argFlag, assertMongoUri, describeMongoTarget, hasFlag } from './lib/env';

import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db/connect';
import { Service, getFiscalSettings, type PaymentMethod } from '../src/lib/models';
import { MoloniProvider } from '../src/lib/invoicing/MoloniProvider';
import { getMoloniAccessToken } from '../src/lib/invoicing/MoloniAuth';
import { moloniCall, type MoloniObj } from '../src/lib/invoicing/moloni-client';

const KEEP = hasFlag('keep');

async function main() {
  console.log('\n🧪 Teste de fatura-recibo em RASCUNHO (não comunicada à AT)');
  console.log(`   MongoDB: ${describeMongoTarget()}\n`);

  assertMongoUri();
  await connectDB();
  const settings = await getFiscalSettings();

  const service = await Service.findOne({ active: true }).sort({ order: 1 }).lean();
  if (!service) throw new Error('Nenhum serviço ativo na base de dados.');

  const nif = argFlag('nif');
  const payment = (argFlag('payment') ?? 'cash') as PaymentMethod;
  const quantity = 1;
  const unitPrice = service.price;
  const vatRate = settings.defaultVatRate === 0 ? 0 : service.vatRate;
  const net = unitPrice * quantity;
  const vat = Math.round((net * vatRate) / 100);

  console.log(
    `   Serviço:   ${service.name.pt} · ${(unitPrice / 100).toFixed(2)} € · IVA ${vatRate}%`,
  );
  console.log(`   Cliente:   ${nif ? `NIF ${nif}` : 'Consumidor Final'}`);
  console.log(`   Pagamento: ${payment}\n`);

  const provider = new MoloniProvider();
  const result = await provider.issueInvoice({
    documentType: 'FR',
    customer: nif
      ? { name: 'Cliente Teste Chi Sublime', vatNumber: nif, country: 'PT' }
      : { name: 'Consumidor Final', country: 'PT' },
    lines: [
      {
        serviceId: String(service._id),
        name: service.name.pt,
        quantity,
        unitPriceNet: unitPrice,
        vatRate,
      },
    ],
    totalNet: net,
    totalVat: vat,
    totalWithVat: net + vat,
    currency: 'EUR',
    internalReference: `TESTE-${Date.now()}`,
    paymentMethod: payment,
    forceDraft: true,
  });

  console.log(`  ✅ Rascunho aceite pela Moloni — document_id ${result.externalDocumentId}`);

  const { accessToken, companyId } = await getMoloniAccessToken();
  const doc = (result.raw as { one?: MoloniObj } | undefined)?.one ?? null;
  if (doc) {
    const products: MoloniObj[] = Array.isArray(doc.products) ? doc.products : [];
    for (const p of products) {
      const taxes = Array.isArray(p.taxes) ? p.taxes.length : 0;
      console.log(
        `     linha: ${p.name} · qty ${p.qty} · ${p.price} € · impostos ${taxes} · isenção ${p.exemption_reason || '—'}`,
      );
    }
    const totals = ['net_value', 'taxes_value', 'gross_value']
      .filter((k) => doc[k] !== undefined)
      .map((k) => `${k}=${doc[k]}`)
      .join('  ');
    if (totals) console.log(`     totais: ${totals}`);
    console.log(
      `     cliente: ${doc.entity_name ?? doc.customer?.name ?? '—'} (${doc.entity_vat ?? doc.customer?.vat ?? '—'})`,
    );
  }

  if (KEEP) {
    console.log(
      '\nℹ️  --keep: o rascunho ficou na Moloni (Documentos → Faturas-Recibo → Rascunhos). Apaga-o à mão depois.\n',
    );
  } else {
    await moloniCall('invoiceReceipts/delete', accessToken, {
      company_id: companyId,
      document_id: Number(result.externalDocumentId),
    });
    console.log('  🧹 Rascunho apagado.');
    console.log('\n✅ O pedido de emissão é válido. Nada foi comunicado à AT.\n');
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  if (err && typeof err === 'object' && 'details' in err && err.details) {
    console.error('   Detalhes:', JSON.stringify(err.details, null, 2));
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
