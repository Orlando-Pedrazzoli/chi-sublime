// 📄 scripts/sync-services-to-moloni.ts
/**
 * Chi Sublime — Sincronizar serviços → artigos Moloni
 * ============================================================
 *
 * Cria (ou atualiza) um artigo na Moloni para cada serviço e guarda o
 * `moloniProductId`. Tipo Serviço, sem stock, referência SRV-<slug>,
 * preço atual e — no regime do art. 53.º — sem IVA com o motivo de
 * isenção configurado.
 *
 * Pré-requisito: scripts/moloni-setup.ts --apply
 *
 * A app também sincroniza sozinha (ao gravar um serviço e, se faltar,
 * ao emitir a fatura). Este script serve para a carga inicial e para
 * voltar a alinhar tudo depois de alterações em massa.
 *
 * USO
 *   npx tsx scripts/sync-services-to-moloni.ts            # simulação
 *   npx tsx scripts/sync-services-to-moloni.ts --apply    # cria/atualiza
 *   --include-inactive   inclui serviços desativados
 *   --mongo-uri="..." --db=chi-sublime
 *
 * Não emite documentos nem comunica nada à AT.
 */

import { assertMongoUri, describeMongoTarget, hasFlag } from './lib/env';

import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db/connect';
import { Service, getFiscalSettings, isVatExemptRegime } from '../src/lib/models';
import { moloniPasswordGrantFromEnv } from '../src/lib/invoicing/moloni-client';
import {
  ensureServiceProduct,
  serviceReference,
  type MoloniContext,
} from '../src/lib/invoicing/moloni-catalog';

const APPLY = hasFlag('apply');
const INCLUDE_INACTIVE = hasFlag('include-inactive');

async function main() {
  console.log(`\n🔄 Serviços → Moloni ${APPLY ? '(APLICAR)' : '(simulação — nada é alterado)'}`);
  console.log(`   MongoDB: ${describeMongoTarget()}\n`);

  assertMongoUri();
  await connectDB();
  const settings = await getFiscalSettings();
  const m = settings.moloni;

  const missing = [
    ['moloni.companyId', m?.companyId],
    ['moloni.productCategoryId', m?.productCategoryId],
    ['moloni.unitId', m?.unitId],
  ].filter(([, v]) => !v);
  if (missing.length) {
    console.error(
      `❌ Em falta: ${missing.map(([k]) => k).join(', ')}. Corre primeiro scripts/moloni-setup.ts --apply`,
    );
    process.exit(1);
  }
  const exempt = isVatExemptRegime(settings);
  console.log(
    `   Regime: ${exempt ? `isenção (${settings.vatExemptionReason})` : `IVA normal (${settings.defaultVatRate}%)`}\n`,
  );

  const services = await Service.find(INCLUDE_INACTIVE ? {} : { active: true })
    .sort({ order: 1, 'name.pt': 1 })
    .lean();

  let ctx: MoloniContext | null = null;
  if (APPLY) {
    const { access_token } = await moloniPasswordGrantFromEnv();
    ctx = { accessToken: access_token, companyId: m!.companyId!, settings };
  }

  let okCount = 0;
  let failCount = 0;
  for (const s of services) {
    const ref = serviceReference(s.slug);
    const price = `${(s.price / 100).toFixed(2).replace('.', ',')} €`;
    const vatNote = exempt || s.vatRate === 0 ? 'isento' : `IVA ${s.vatRate}%`;
    const label = `${s.name.pt.padEnd(38).slice(0, 38)} ${ref.padEnd(30)} ${price.padStart(9)}  ${vatNote}`;

    if (!APPLY) {
      console.log(
        `   ${s.moloniProductId ? '↻' : '+'} ${label}${s.moloniProductId ? `  (#${s.moloniProductId})` : ''}`,
      );
      continue;
    }
    try {
      const productId = await ensureServiceProduct(ctx!, String(s._id), { forceUpdate: true });
      console.log(`   ✅ ${label}  → #${productId}`);
      okCount++;
    } catch (err) {
      console.log(`   ❌ ${label}\n      ${err instanceof Error ? err.message : err}`);
      failCount++;
    }
  }

  if (!APPLY) {
    console.log(
      `\nℹ️  ${services.length} serviços. "+" = criar · "↻" = atualizar. Corre com --apply.\n`,
    );
  } else {
    console.log(`\n${failCount ? '⚠️' : '✅'} ${okCount} sincronizados · ${failCount} com erro\n`);
  }

  await mongoose.disconnect();
  if (failCount) process.exit(1);
}

main().catch(async (err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
