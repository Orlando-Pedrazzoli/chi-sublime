import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { connectDB } from '@/lib/db/connect';
import { User } from '@/lib/models/User';
import { Client } from '@/lib/models/Client';
import { logAudit } from '@/lib/models/AuditLog';
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

    /**
     * Google OAuth — "Continuar com Google".
     * Env: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (Auth.js v5
     * deteta-as automaticamente; explícitas por clareza).
     * A criação/vínculo da conta é feita no callback `signIn`.
     */
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  // ──────────────────────────────────────────────────────────
  // Callbacks
  // ──────────────────────────────────────────────────────────
  callbacks: {
    /**
     * `signIn` — porteiro do OAuth Google.
     * - Email tem de vir verificado pela Google
     * - Conta existente com o mesmo email → account linking
     *   (entra na conta existente, seja client ou admin)
     * - Conta nova → replica o fluxo do registo: cria/vincula
     *   Client (regra do modelo: client exige clientId) + User
     *   sem passwordHash (login passa a ser via Google; o user
     *   pode definir password depois via "recuperar password")
     */
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;

      const email = profile?.email?.toLowerCase().trim();
      const emailVerified =
        profile && 'email_verified' in profile ? Boolean(profile.email_verified) : false;
      if (!email || !emailVerified) return false;

      await connectDB();

      const existing = await User.findOne({ email }).lean();
      if (existing) return existing.active !== false; // linking por email verificado

      // ── Conta nova: criar/vincular Client + User ──
      const displayName = (profile?.name ?? email.split('@')[0]).trim();

      let clientDoc = await Client.findOne({
        email,
        userId: { $exists: false },
        active: true,
      });
      let clientCreated = false;

      if (!clientDoc) {
        try {
          clientDoc = await Client.create({
            name: displayName,
            phone: '+351000000000', // placeholder — pedido depois na 1ª marcação
            email,
            source: 'online',
            marketingConsent: false,
            active: true,
          });
          clientCreated = true;
        } catch (err) {
          console.error('[google-signin] falha ao criar Client:', err);
          return false;
        }
      }

      try {
        const userDoc = await User.create({
          email,
          name: displayName,
          role: 'client',
          clientId: clientDoc._id,
          active: true,
          // sem passwordHash — autenticação via Google
        });
        await Client.updateOne({ _id: clientDoc._id }, { $set: { userId: userDoc._id } });

        await logAudit({
          action: 'create',
          resource: 'user',
          resourceId: userDoc._id.toString(),
          resourceLabel: userDoc.name,
          userId: userDoc._id,
          userName: userDoc.name,
          userEmail: userDoc.email,
          userRole: userDoc.role,
          message: `Novo registo de cliente via Google: ${userDoc.email}`,
          severity: 'info',
          metadata: {
            provider: 'google',
            clientCreated,
            clientId: clientDoc._id.toString(),
            autoMatched: !clientCreated,
          },
        }).catch(() => {});
      } catch (err) {
        if (clientCreated) await Client.deleteOne({ _id: clientDoc._id }).catch(() => {});
        console.error('[google-signin] falha ao criar User:', err);
        return false;
      }

      return true;
    },

    /**
     * `jwt` corre sempre que o token é criado ou actualizado.
     * Aqui copiamos os dados do `user` (devolvido pelo authorize)
     * para o token, que vai parar ao cookie httpOnly.
     */
    async jwt({ token, user, account, trigger, session }) {
      // Login via Google — o `user` vem do perfil OAuth (sem role/
      // clientId nossos), por isso vamos buscar o User ao Mongo
      if (account?.provider === 'google' && token.email) {
        await connectDB();
        const dbUser = await User.findOne({
          email: (token.email as string).toLowerCase(),
          active: true,
        }).lean();
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.clientId = dbUser.clientId?.toString();
          await User.updateOne({ _id: dbUser._id }, { $set: { lastLoginAt: new Date() } }).catch(
            () => {},
          );
        }
        return token;
      }

      // Login inicial (credentials)
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
