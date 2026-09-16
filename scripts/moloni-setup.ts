// 📄 scripts/moloni-setup.ts
/**
 * Chi Sublime — Configuração da integração Moloni
 * ============================================================
 *
 * Lê a conta Moloni e grava no FiscalSettings tudo o que a emissão de
 * faturas-recibo precisa. Não emite documentos.
 *
 * O QUE CONFIGURA
 *  Moloni → FiscalSettings.moloni
 *    companyId, defaultDocumentSetId + documentSetName, consumidorFinalCustomerId,
 *    taxIds (6/13/23), productCategoryId ("Serviços"), unitId ("Unidade"),
 *    defaultMaturityDateId (pronto pagamento), paymentMethods (Numerário, MB WAY,
 *    Multibanco, Cartão, Transferência — cria os que faltarem)
 *  Regime de IVA (art. 53.º)
 *    vatExemptionReason = código lido do artigo TESTE (ex.: "M10-1")
 *    defaultVatRate = 0 e TODOS os serviços com vatRate 0
 *  Empresa (FiscalSettings)
 *    companyName, vatNumber, morada fiscal — a partir da ficha na Moloni
 *
 * USO
 *   npx tsx scripts/moloni-setup.ts                 # simulação: mostra o plano
 *   npx tsx scripts/moloni-setup.ts --apply         # grava
 *   npx tsx scripts/moloni-setup.ts --apply --activate
 *        # grava e passa invoiceProvider para "moloni" (faturas reais!)
 *
 * Outras flags: --nif=295145870  --exemption=M10-1  --test-ref=TESTE  --set=M
 *               --mongo-uri="..." --db=chi-sublime   (base de dados alvo)
 *
 * Correr uma vez por base de dados (desenvolvimento e produção).
 */

import { argFlag, assertMongoUri, describeMongoTarget, hasFlag } from './lib/env';

import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db/connect';
import { FiscalSettings, Service, getFiscalSettings } from '../src/lib/models';
import {
  moloniCall,
  moloniPasswordGrantFromEnv,
  type MoloniObj,
} from '../src/lib/invoicing/moloni-client';

const APPLY = hasFlag('apply');
const ACTIVATE = hasFlag('activate');
const CONSUMIDOR_FINAL_VAT = '999999990';

type PM = 'cash' | 'mb_way' | 'multibanco' | 'card_terminal' | 'transfer';
const PAYMENT_METHODS: Record<PM, { label: string; match: RegExp }> = {
  cash: { label: 'Numerário', match: /numer[aá]rio|dinheiro/i },
  mb_way: { label: 'MB WAY', match: /mb\s*way/i },
  multibanco: { label: 'Multibanco', match: /^multibanco$|refer[eê]ncia/i },
  card_terminal: { label: 'Cartão', match: /cart[aã]o|tpa|d[eé]bito|cr[eé]dito/i },
  transfer: { label: 'Transferência', match: /transfer/i },
};

const ok = (t: string) => console.log(`  ✅ ${t}`);
const warn = (t: string) => console.log(`  ⚠️  ${t}`);
const info = (t: string) => console.log(`     ${t}`);
const title = (t: string) => console.log(`\n\x1b[36m━━ ${t}\x1b[0m`);

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main() {
  console.log(`\n🔧 Configuração Moloni ${APPLY ? '(APLICAR)' : '(simulação — nada é gravado)'}`);
  console.log(`   MongoDB: ${describeMongoTarget()}`);

  assertMongoUri();
  await connectDB();
  const settings = await getFiscalSettings();
  const { access_token: token } = await moloniPasswordGrantFromEnv();
  ok('Login na Moloni');

  // ── Empresa ────────────────────────────────────────────────
  title('Empresa');
  const nif =
    argFlag('nif') ??
    (/^\d{9}$/.test(settings.vatNumber) && settings.vatNumber !== '000000000'
      ? settings.vatNumber
      : '295145870');
  const companies = await moloniCall<MoloniObj[]>('companies/getAll', token, {});
  const company = companies.find((c) => String(c.vat).replace(/\D/g, '') === nif);
  if (!company) fail(`Nenhuma empresa Moloni com NIF ${nif} (usa --nif=...)`);
  const companyId = Number(company.company_id);
  ok(`${company.name} — company_id ${companyId}`);

  const companyDetails = await moloniCall<MoloniObj>('companies/getOne', token, {
    company_id: companyId,
  }).catch(() => company);
  const address = String(companyDetails.address ?? '').trim();
  const zip = String(companyDetails.zip_code ?? '').trim();
  const city = String(companyDetails.city ?? '').trim();
  info(`Morada fiscal: ${address || '—'} · ${zip || '—'} ${city}`);

  // ── Série ──────────────────────────────────────────────────
  title('Série');
  const sets = await moloniCall<MoloniObj[]>('documentSets/getAll', token, {
    company_id: companyId,
  });
  const wantedSet = argFlag('set');
  const set =
    (wantedSet && sets.find((s) => s.name === wantedSet)) ||
    sets.find((s) => Number(s.active_by_default) === 1) ||
    (sets.length === 1 ? sets[0] : undefined);
  if (!set)
    fail(
      `Não foi possível escolher a série (${sets.map((s) => s.name).join(', ')}). Usa --set=NOME`,
    );
  ok(`Série "${set.name}" — document_set_id ${set.document_set_id}`);

  // ── Consumidor final ───────────────────────────────────────
  title('Consumidor Final');
  const cf = await moloniCall<MoloniObj[]>('customers/getByVat', token, {
    company_id: companyId,
    vat: CONSUMIDOR_FINAL_VAT,
  });
  if (!cf[0]?.customer_id) fail('Cliente "Consumidor Final" (999999990) não existe na Moloni.');
  ok(`customer_id ${cf[0].customer_id}`);

  // ── Impostos ───────────────────────────────────────────────
  title('Impostos');
  const taxes = await moloniCall<MoloniObj[]>('taxes/getAll', token, { company_id: companyId });
  const taxByValue = (v: number) => taxes.find((t) => Number(t.value) === v)?.tax_id;
  const taxIds = {
    vat_23: taxByValue(23) ? Number(taxByValue(23)) : undefined,
    vat_13: taxByValue(13) ? Number(taxByValue(13)) : undefined,
    vat_6: taxByValue(6) ? Number(taxByValue(6)) : undefined,
  };
  info(
    `23% → ${taxIds.vat_23 ?? '—'} · 13% → ${taxIds.vat_13 ?? '—'} · 6% → ${taxIds.vat_6 ?? '—'}`,
  );
  if (taxes.some((t) => Number(t.active_by_default) === 1)) {
    warn('Há um imposto predefinido na Moloni — em regime de isenção convém não haver.');
  }

  // ── Motivo de isenção ──────────────────────────────────────
  title('Isenção de IVA');
  let exemption = argFlag('exemption');
  if (!exemption) {
    const ref = argFlag('test-ref') ?? 'TESTE';
    const products = await moloniCall<MoloniObj[]>('products/getByReference', token, {
      company_id: companyId,
      reference: ref,
      exact: 1,
    });
    exemption = products[0]?.exemption_reason ? String(products[0].exemption_reason) : undefined;
    if (exemption) info(`Lido do artigo ${ref}`);
  }
  if (!exemption) {
    fail(
      'Motivo de isenção não encontrado. Cria o artigo TESTE com "M10 | IVA - Regime de isenção" ou usa --exemption=CODIGO',
    );
  }
  if (!/^M10/.test(exemption)) warn(`Motivo "${exemption}" — para o art. 53.º o esperado é M10.`);
  ok(`Motivo de isenção: ${exemption}`);

  // ── Categoria e unidade ────────────────────────────────────
  title('Categoria e unidade dos artigos');
  const categories = await moloniCall<MoloniObj[]>('productCategories/getAll', token, {
    company_id: companyId,
    parent_id: 0,
  });
  let category = categories.find((c) => /servi[cç]os?/i.test(String(c.name)));
  if (!category) {
    if (APPLY) {
      const created = await moloniCall<MoloniObj>('productCategories/insert', token, {
        company_id: companyId,
        parent_id: 0,
        name: 'Serviços',
        description: '',
        pos_available: 1,
      });
      category = { category_id: created.category_id, name: 'Serviços' };
      ok(`Categoria "Serviços" criada — ${category.category_id}`);
    } else {
      warn('Categoria "Serviços" não existe — será criada com --apply');
    }
  } else {
    ok(`Categoria "${category.name}" — ${category.category_id}`);
  }

  const units = await moloniCall<MoloniObj[]>('measurementUnits/getAll', token, {
    company_id: companyId,
  });
  const unit = units.find(
    (u) => /^unidade/i.test(String(u.name)) || /^uni/i.test(String(u.short_name)),
  );
  if (!unit) fail(`Unidade "Unidade" não encontrada (${units.map((u) => u.name).join(', ')})`);
  ok(`Unidade "${unit.name}" — ${unit.unit_id}`);

  const maturities = await moloniCall<MoloniObj[]>('maturityDates/getAll', token, {
    company_id: companyId,
  });
  const maturity = maturities.find((m) => Number(m.days) === 0) ?? maturities[0];
  if (!maturity) fail('Nenhum prazo de vencimento na Moloni.');
  ok(`Prazo de vencimento "${maturity.name}" — ${maturity.maturity_date_id}`);

  // ── Meios de pagamento ─────────────────────────────────────
  title('Meios de pagamento');
  const methods = await moloniCall<MoloniObj[]>('paymentMethods/getAll', token, {
    company_id: companyId,
  });
  const paymentMethods: Partial<Record<PM, number>> = {};
  for (const [key, def] of Object.entries(PAYMENT_METHODS) as [
    PM,
    (typeof PAYMENT_METHODS)[PM],
  ][]) {
    const found = methods.find((m) => def.match.test(String(m.name)));
    if (found) {
      paymentMethods[key] = Number(found.payment_method_id);
      ok(`${def.label} → "${found.name}" (${found.payment_method_id})`);
    } else if (APPLY) {
      const created = await moloniCall<MoloniObj>('paymentMethods/insert', token, {
        company_id: companyId,
        name: def.label,
      });
      paymentMethods[key] = Number(created.payment_method_id);
      ok(`${def.label} → criado (${created.payment_method_id})`);
    } else {
      warn(`${def.label} não existe — será criado com --apply`);
    }
  }

  // ── Serviços ───────────────────────────────────────────────
  title('Serviços (IVA)');
  const withVat = await Service.countDocuments({ vatRate: { $ne: 0 } });
  const total = await Service.countDocuments({});
  info(`${total} serviços · ${withVat} com IVA ≠ 0 → passam a 0 (regime de isenção)`);

  // ── Aplicar ────────────────────────────────────────────────
  title('Resultado');
  const set$: Record<string, unknown> = {
    'moloni.enabled': true,
    'moloni.companyId': companyId,
    'moloni.defaultDocumentSetId': Number(set.document_set_id),
    'moloni.documentSetName': String(set.name),
    'moloni.consumidorFinalCustomerId': Number(cf[0].customer_id),
    'moloni.defaultMaturityDateId': Number(maturity.maturity_date_id),
    'moloni.unitId': Number(unit.unit_id),
    'moloni.taxIds': taxIds,
    'moloni.paymentMethods': paymentMethods,
    'moloni.defaultPaymentMethodId': paymentMethods.cash,
    vatExemptionReason: exemption,
    defaultVatRate: 0,
    companyName: String(company.name),
    vatNumber: nif,
  };
  if (taxIds.vat_23) set$['moloni.vatTaxId'] = taxIds.vat_23;
  if (category?.category_id) set$['moloni.productCategoryId'] = Number(category.category_id);
  if (address) set$.address = address;
  if (/^\d{4}-\d{3}$/.test(zip)) set$.postalCode = zip;
  if (city) set$.city = city;
  if (ACTIVATE) set$.invoiceProvider = 'moloni';

  if (!APPLY) {
    console.log('\n   Seria gravado no FiscalSettings:');
    console.log(
      JSON.stringify(set$, null, 2)
        .split('\n')
        .map((l) => `   ${l}`)
        .join('\n'),
    );
    console.log('\nℹ️  Simulação. Corre com --apply para gravar.\n');
  } else {
    await FiscalSettings.updateOne({ key: 'default' }, { $set: set$ });
    const res = await Service.updateMany({ vatRate: { $ne: 0 } }, { $set: { vatRate: 0 } });
    ok(`FiscalSettings atualizado`);
    ok(`${res.modifiedCount} serviços passaram a IVA 0`);
    if (ACTIVATE)
      warn('invoiceProvider = "moloni" — as próximas faturas são REAIS e comunicadas à AT.');
    else
      info(
        'invoiceProvider mantém-se "' +
          settings.invoiceProvider +
          '" (usa --activate quando for para produção).',
      );
    console.log('\n➡️  Próximo passo: npx tsx scripts/sync-services-to-moloni.ts --apply\n');
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
