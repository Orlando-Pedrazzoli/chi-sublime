/**
 * Chi Sublime — Test MongoDB connection
 * ============================================================
 *
 * Script standalone para testar a conexão com MongoDB Atlas.
 * Como correr: npx tsx scripts/test-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

async function main() {
  // ... resto continua igual
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI não está definida no .env.local');
    process.exit(1);
  }

  console.log('🔌 A conectar a MongoDB Atlas...');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ Ligação estabelecida!');
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   ReadyState: ${mongoose.connection.readyState} (1 = conectado)`);

    // Lista collections existentes
    const collections = await mongoose.connection.db?.listCollections().toArray();

    if (collections && collections.length > 0) {
      console.log('\n📚 Collections existentes:');
      collections.forEach((c) => console.log(`   - ${c.name}`));
    } else {
      console.log('\n📚 Database vazia (zero collections) — esperado em primeira execução');
    }

    await mongoose.disconnect();
    console.log('\n✅ Teste concluído. Conexão fechada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao conectar:');
    console.error(err);
    process.exit(1);
  }
}

main();
