// 📄 scripts/fix-cabeleireiro-slug.ts
/**
 * Chi Sublime — Corrige a categoria "Cabelereiro" → "Cabeleireiro"
 * ============================================================
 *
 * A categoria principal foi criada com um erro ortográfico no nome
 * e no slug ("cabelereiro"). Resultado: o title da página mais
 * importante do site saía como "Cabelereiro em Cascais", quando
 * toda a gente pesquisa "cabeleireiro Cascais".
 *
 * Este script, na coleção `categories`:
 *   - slug     "cabelereiro"  → "cabeleireiro"
 *   - name.pt  "Cabelereiro"  → "Cabeleireiro"  (só se ainda tiver o erro)
 *
 * Não toca em serviços, marcações nem na Moloni (os serviços ligam à
 * categoria por _id, não pelo slug).
 *
 * O site trata do resto sozinho: depois de correr, o URL antigo
 * /servicos/cabelereiro passa a responder 301 → /servicos/cabeleireiro
 * (ver LEGACY_CATEGORY_SLUGS em src/lib/seo/site.ts).
 *
 * USO (PowerShell, na raiz do projeto) — correr DEPOIS do deploy:
 *
 *   npx tsx scripts/fix-cabeleireiro-slug.ts --db=chi-sublime             # só mostra
 *   npx tsx scripts/fix-cabeleireiro-slug.ts --db=chi-sublime --apply     # grava
 *
 * Repetir com --db=chi-sublime-dev para a base de dados de desenvolvimento.
 * É idempotente: correr duas vezes não faz mal.
 */

import { assertMongoUri, describeMongoTarget, hasFlag } from './lib/env';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db/connect';
import { Category } from '../src/lib/models/Category';

const OLD_SLUG = 'cabelereiro';
const NEW_SLUG = 'cabeleireiro';
const OLD_NAME = 'Cabelereiro';
const NEW_NAME = 'Cabeleireiro';

async function main() {
  assertMongoUri();
  const apply = hasFlag('apply');

  console.log(`\n🎯 Alvo: ${describeMongoTarget()}`);
  console.log(apply ? '✍️  Modo: GRAVAR (--apply)\n' : '👀 Modo: só mostrar (sem --apply)\n');

  await connectDB();

  const [oldCat, newCat] = await Promise.all([
    Category.findOne({ slug: OLD_SLUG }).lean(),
    Category.findOne({ slug: NEW_SLUG }).lean(),
  ]);

  if (!oldCat && newCat) {
    console.log(`✅ Já está corrigido: existe "${NEW_SLUG}" (${newCat.name.pt}). Nada a fazer.`);
    return;
  }
  if (!oldCat) {
    console.log(`ℹ️  Não existe nenhuma categoria com o slug "${OLD_SLUG}". Nada a fazer.`);
    return;
  }
  if (newCat) {
    console.error(
      `❌ Existem as DUAS categorias ("${OLD_SLUG}" e "${NEW_SLUG}"). Não altero nada — ` +
        'resolve manualmente no admin (mover os serviços e desativar a antiga).',
    );
    process.exitCode = 1;
    return;
  }

  const nextName = oldCat.name.pt === OLD_NAME ? NEW_NAME : oldCat.name.pt;
  console.log('Categoria encontrada:');
  console.log(`   slug:    ${oldCat.slug}  →  ${NEW_SLUG}`);
  console.log(`   name.pt: ${oldCat.name.pt}  →  ${nextName}`);

  if (!apply) {
    console.log('\n(nada gravado — volta a correr com --apply para aplicar)');
    return;
  }

  await Category.updateOne({ _id: oldCat._id }, { $set: { slug: NEW_SLUG, 'name.pt': nextName } });
  console.log('\n✅ Gravado. Confirma em produção:');
  console.log('   https://www.chisublime.pt/servicos/cabeleireiro   → 200');
  console.log('   https://www.chisublime.pt/servicos/cabelereiro    → 301 para o de cima');
}

main()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
