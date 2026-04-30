import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/models/User';
import { verifyPassword, needsRehash, hashPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validation/auth';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export const authConfig: NextAuthConfig = {
  // ──────────────────────────────────────────────────────────
  // Sessão
  // ──────────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60 * 24, // renova token a cada 24h de uso
  },

  // ──────────────────────────────────────────────────────────
  // Páginas customizadas
  // ──────────────────────────────────────────────────────────
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },

  // ──────────────────────────────────────────────────────────
  // Providers
  // ──────────────────────────────────────────────────────────
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Validação Zod do shape do input
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          website: '', // honeypot vazio implícito
        });
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // 2. Procurar utilizador (incluindo passwordHash que tem select: false)
        await connectDB();
        const user = await User.findOne({ email, active: true }).select('+passwordHash').lean();

        if (!user || !user.passwordHash) return null;

        // 3. Verificar password
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // 4. Rehash automático se necessário (BCRYPT_ROUNDS aumentou no futuro)
        if (needsRehash(user.passwordHash)) {
          const newHash = await hashPassword(password);
          await User.updateOne({ _id: user._id }, { $set: { passwordHash: newHash } });
        }

        // 5. Audit: lastLoginAt
        await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

        // 6. Devolver dados que vão para o JWT (callback `jwt`)
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId?.toString(),
        };
      },
    }),
  ],

  // ──────────────────────────────────────────────────────────
  // Callbacks
  // ──────────────────────────────────────────────────────────
  callbacks: {
    /**
     * `jwt` corre sempre que o token é criado ou actualizado.
     * Aqui copiamos os dados do `user` (devolvido pelo authorize)
     * para o token, que vai parar ao cookie httpOnly.
     */
    async jwt({ token, user, trigger, session }) {
      // Login inicial
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.name = user.name as string;
        token.role = user.role as 'client' | 'admin';
        token.clientId = user.clientId as string | undefined;
      }

      // Trigger 'update' — quando chamamos `update()` em Client Component
      // (útil quando o cliente actualiza nome/telefone e queremos refletir já)
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
      }

      return token;
    },

    /**
     * `session` constrói o objecto que `useSession()` e `auth()` devolvem.
     * Mapeia o token → session.user.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.clientId = token.clientId;
      }
      return session;
    },
  },

  // ──────────────────────────────────────────────────────────
  // Cookies
  // ──────────────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-chi-sublime.session-token'
          : 'chi-sublime.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // ──────────────────────────────────────────────────────────
  // Outros
  // ──────────────────────────────────────────────────────────
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
