import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Sessão do utilizador autenticado.
   * Disponível via `auth()` em Server Components/Server Actions
   * e via `useSession()` em Client Components.
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'client' | 'admin';
      clientId?: string; // Presente para role: 'client'
    };
  }

  /**
   * Objecto User devolvido pelo callback `authorize` do Credentials provider.
   * É o ponto de entrada de dados na sessão.
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'client' | 'admin';
    clientId?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Conteúdo do token JWT (assinado, no cookie httpOnly).
   * Espelha os campos relevantes da Session.
   */
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'client' | 'admin';
    clientId?: string;
  }
}
