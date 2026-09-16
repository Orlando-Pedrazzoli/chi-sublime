// 📄 scripts/moloni-diagnostic.ts
/**
 * Chi Sublime — Diagnóstico Moloni (SÓ LEITURA)
 * ============================================================
 *
 * Faz login na API da Moloni com as credenciais do .env.local e
 * mostra os IDs de que a integração precisa:
 *
 *   - company_id          (empresa do Jean, pelo NIF)
 *   - document_set_id     (série — ex.: "M")
 *   - ID do Consumidor Final (NIF 999999990)
 *   - ID do artigo de teste (referência TESTE) + isenção
 *   - IDs dos impostos (IVA Normal, etc.)
 *
 * GARANTIAS
 * ---------
 *  - NÃO usa MongoDB (não importa modelos nem mongoose).
 *  - NÃO grava tokens em lado nenhum (ao contrário do MoloniAuth.ts,
 *    que guarda no FiscalSettings).
 *  - Só chama endpoints de leitura (getAll / getByVat / getByReference).
 *    Não cria, altera nem emite nada — nada é comunicado à AT.
 *  - Nunca imprime a password, a chave secreta nem o token completo.
 *
 * USO
 * ---
 *   npx tsx scripts/moloni-diagnostic.ts
 *   npx tsx scripts/moloni-diagnostic.ts --nif=295145870 --ref=TESTE
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;

const COMPANY_NIF = arg('nif', '295145870');
const TEST_REFERENCE = arg('ref', 'TESTE');
const CONSUMIDOR_FINAL_NIF = '999999990';

/** Lê .env.local (e .env) sem dependências. Aspas simples/duplas são removidas. */
function loadEnvFiles(): void {
  for (const file of ['.env.local', '.env']) {
    let content: string;
    try {
      content = readFileSync(resolve(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      // O ambiente e o .env.local têm prioridade sobre o .env
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const BASE_URL = process.env.MOLONI_BASE_URL || 'https://api.moloni.pt/v1/';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ ${name} em falta no .env.local`);
    process.exit(1);
  }
  return value;
}

// ------------------------------------------------------------
// HTTP
// ------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respostas da API Moloni sem tipos oficiais
type AnyObj = Record<string, any>;

async function grant(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: requireEnv('MOLONI_CLIENT_ID'),
    client_secret: requireEnv('MOLONI_CLIENT_SECRET'),
    username: requireEnv('MOLONI_USERNAME'),
    password: requireEnv('MOLONI_PASSWORD'),
  });
  const res = await fetch(`${BASE_URL}grant/?${params.toString()}`);
  const data = (await res.json().catch(() => ({}))) as AnyObj;

  if (!data.access_token) {
    console.error('❌ Login na Moloni falhou.');
    console.error(`   Resposta: ${data.error_description || data.error || `HTTP ${res.status}`}`);
    console.error('\n   Verifica:');
    console.error('   - MOLONI_CLIENT_ID é exatamente o Developer ID guardado na Moloni');
    console.error('   - MOLONI_CLIENT_SECRET é a Chave Secreta completa');
    console.error(
      '   - MOLONI_USERNAME / MOLONI_PASSWORD são o login da MOLONI (não das Finanças)',
    );
    console.error('   - a password não tem $ ou # sem aspas simples no .env.local');
    process.exit(1);
  }
  return data.access_token as string;
}

async function call(token: string, endpoint: string, body: AnyObj = {}): Promise<unknown> {
  const url = `${BASE_URL}${endpoint}/?access_token=${encodeURIComponent(token)}&json=true&human_errors=1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (data && !Array.isArray(data) && (data.error || data.errors)) {
    throw new Error(`${endpoint}: ${JSON.stringify(data.error ?? data.errors)}`);
  }
  return data;
}

// ------------------------------------------------------------
// Output helpers
// ------------------------------------------------------------

const title = (t: string) =>
  console.log(`\n\x1b[36m━━ ${t} ${'━'.repeat(Math.max(0, 56 - t.length))}\x1b[0m`);
const ok = (t: string) => console.log(`  ✅ ${t}`);
const warn = (t: string) => console.log(`  ⚠️  ${t}`);
const info = (t: string) => console.log(`     ${t}`);

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function main() {
  console.log(`\n🔌 Moloni API: ${BASE_URL}`);
  console.log('   Modo: só leitura (sem MongoDB, sem emitir documentos)');

  const token = await grant();
  ok(`Login OK (token ${token.slice(0, 6)}…)`);

  const summary: AnyObj = {};

  // 1) Empresa
  title('1. Empresa');
  const companies = ((await call(token, 'companies/getAll')) ?? []) as AnyObj[];
  if (companies.length === 0) {
    warn('Nenhuma empresa associada a este utilizador.');
    process.exit(1);
  }
  for (const c of companies) {
    info(`company_id=${c.company_id}  NIF=${c.vat}  ${c.name}`);
  }
  const company = companies.find((c) => String(c.vat).replace(/\D/g, '') === COMPANY_NIF) ?? null;
  if (!company) {
    warn(`Nenhuma empresa com NIF ${COMPANY_NIF}. Usa --nif=... ou confirma a conta.`);
    process.exit(1);
  }
  ok(`Empresa do Jean: company_id = ${company.company_id}`);
  summary.companyId = Number(company.company_id);
  const company_id = summary.companyId;

  // 2) Séries
  title('2. Séries de documentos');
  const sets = ((await call(token, 'documentSets/getAll', { company_id })) ?? []) as AnyObj[];
  if (sets.length === 0) warn('Nenhuma série encontrada.');
  for (const s of sets) {
    const atCodes = Array.isArray(s.document_type_series)
      ? s.document_type_series.map((d: AnyObj) => d.validation_code || d.at_code).filter(Boolean)
      : [];
    info(
      `document_set_id=${s.document_set_id}  nome="${s.name}"` +
        `${Number(s.active_by_default) === 1 ? '  (predefinida)' : ''}` +
        `${atCodes.length ? `  ATCUD/validação: ${atCodes.join(', ')}` : ''}`,
    );
  }
  const defaultSet =
    sets.find((s) => Number(s.active_by_default) === 1) ?? (sets.length === 1 ? sets[0] : null);
  if (defaultSet) {
    ok(`Série a usar: document_set_id = ${defaultSet.document_set_id} ("${defaultSet.name}")`);
    summary.defaultDocumentSetId = Number(defaultSet.document_set_id);
  } else if (sets.length > 1) {
    warn('Várias séries e nenhuma predefinida — escolhe o document_set_id da lista acima.');
  }

  // 3) Consumidor Final
  title('3. Consumidor Final');
  const cf = ((await call(token, 'customers/getByVat', {
    company_id,
    vat: CONSUMIDOR_FINAL_NIF,
  })) ?? []) as AnyObj[];
  if (cf.length > 0) {
    ok(`customer_id = ${cf[0].customer_id}  (${cf[0].name}, NIF ${cf[0].vat})`);
    summary.consumidorFinalCustomerId = Number(cf[0].customer_id);
  } else {
    warn(`Nenhum cliente com NIF ${CONSUMIDOR_FINAL_NIF}.`);
  }

  // 4) Impostos
  title('4. Impostos');
  const taxes = ((await call(token, 'taxes/getAll', { company_id })) ?? []) as AnyObj[];
  for (const t of taxes) {
    info(
      `tax_id=${t.tax_id}  "${t.name}"  ${t.value}%` +
        `${Number(t.active_by_default) === 1 ? '  (predefinido ⚠️)' : ''}`,
    );
  }
  if (taxes.some((t) => Number(t.active_by_default) === 1)) {
    warn('Há um imposto predefinido — artigos novos podem nascer com IVA.');
  } else {
    ok('Nenhum imposto predefinido.');
  }

  // 5) Artigo de teste
  title(`5. Artigo "${TEST_REFERENCE}"`);
  const products = ((await call(token, 'products/getByReference', {
    company_id,
    reference: TEST_REFERENCE,
  })) ?? []) as AnyObj[];
  if (products.length === 0) {
    warn(`Nenhum artigo com referência ${TEST_REFERENCE}.`);
  } else {
    const p = products[0];
    const pTaxes = Array.isArray(p.taxes) ? p.taxes : [];
    info(`product_id=${p.product_id}  "${p.name}"  preço=${p.price}  tipo=${p.type}`);
    if (pTaxes.length === 0 && p.exemption_reason) {
      ok(`Sem IVA, isenção ${p.exemption_reason}`);
    } else if (pTaxes.length > 0) {
      warn(`O artigo TEM impostos (${pTaxes.length}) — devia estar isento (M10).`);
    } else {
      warn('Sem impostos e SEM razão de isenção — a fatura não vai fechar.');
    }
    if (p.exemption_reason && p.exemption_reason !== 'M10') {
      warn(`Isenção ${p.exemption_reason} — o esperado para o art. 53.º é M10.`);
    }
    summary.testProductId = Number(p.product_id);
  }

  // Resumo
  title('Resumo para FiscalSettings / .env.local');
  if (summary.companyId) info(`MOLONI_COMPANY_ID=${summary.companyId}`);
  console.log('\n     FiscalSettings.moloni:');
  console.log(
    JSON.stringify(
      {
        companyId: summary.companyId,
        defaultDocumentSetId: summary.defaultDocumentSetId,
        consumidorFinalCustomerId: summary.consumidorFinalCustomerId,
      },
      null,
      2,
    )
      .split('\n')
      .map((l) => `     ${l}`)
      .join('\n'),
  );
  info('vatExemptionReason: "M10"');
  console.log('\n✅ Diagnóstico concluído. Nada foi alterado.\n');
}

main().catch((err) => {
  console.error('\n❌ Erro:', err instanceof Error ? err.message : err);
  process.exit(1);
});
