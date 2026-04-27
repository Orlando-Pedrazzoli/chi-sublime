/**
 * Chi Sublime — MongoDB Connection Singleton
 * ============================================================
 *
 * Em Next.js dev, o hot-reload recarrega módulos várias vezes.
 * Sem cache, cada reload abriria nova conexão -> centenas em minutos.
 * Solução: usar `globalThis` para preservar conexão entre reloads.
 *
 * Em produção (Vercel), cada serverless function instance reutiliza
 * conexão dentro do mesmo container (warm start).
 */

import mongoose, { type Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'chi-sublime';

/**
 * Tipo do cache global — preservado entre hot-reloads em dev.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Estendemos o globalThis para incluir o nosso cache.
 * Isto evita criar novas conexões a cada hot-reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache ?? { conn: null, promise: null };

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

/**
 * Conecta à base de dados MongoDB.
 *
 * @returns A instância Mongoose conectada, ou `null` se MONGODB_URI não estiver configurada.
 *
 * Uso:
 * ```ts
 * import { connectDB } from "@/lib/db/connect";
 *
 * export async function GET() {
 *   const db = await connectDB();
 *   if (!db) return Response.json({ error: "DB indisponível" }, { status: 503 });
 *   // ... usar mongoose models
 * }
 * ```
 */
export async function connectDB(): Promise<Mongoose | null> {
  // Defensive: se não há URI configurada, avisa e devolve null
  if (!MONGODB_URI) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️  MONGODB_URI não configurada. Funcionalidades de base de dados desativadas.\n' +
          '   Configura em .env.local quando criares cluster MongoDB Atlas.',
      );
    }
    return null;
  }

  // Se já temos conexão ativa, devolve-a (caso comum)
  if (cached.conn) {
    return cached.conn;
  }

  // Se há uma promessa de conexão pendente, espera por ela
  // (evita race conditions quando várias requests pedem DB ao mesmo tempo)
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
      // Em produção: timeout mais longo, mais retries
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      // Otimização: pool de conexões adequado a serverless
      maxPoolSize: 10,
      minPoolSize: 1,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `✅ MongoDB conectado: ${mongooseInstance.connection.host} (db: ${MONGODB_DB_NAME})`,
          );
        }
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null; // permite retry na próxima chamada
        console.error('❌ Erro ao conectar a MongoDB:', error.message);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

/**
 * Desconecta da base de dados.
 * Útil em testes ou shutdown gracioso.
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

/**
 * Verifica se a conexão está ativa e saudável.
 * Útil para healthchecks.
 */
export function isDBConnected(): boolean {
  return cached.conn?.connection.readyState === 1;
}
