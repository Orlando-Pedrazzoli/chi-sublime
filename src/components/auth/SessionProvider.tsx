'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * Wrapper Client Component à volta do SessionProvider do NextAuth.
 * Necessário porque o RootLayout é Server Component e não pode
 * directamente importar SessionProvider (que é client-only).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
