import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { requireClient } from '@/lib/auth/permissions';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ClientNav } from '@/components/client-area/ClientNav';

export const metadata: Metadata = {
  title: {
    template: '%s · A minha conta',
    default: 'A minha conta · Chi Sublime',
  },
  robots: { index: false, follow: false },
};

export default async function ClientAreaLayout({ children }: { children: ReactNode }) {
  const user = await requireClient();
  const firstName = user.name.split(/\s+/)[0];

  return (
    <>
      <PublicNavbar />

      <main
        className="min-h-screen px-6 pt-32 pb-16 md:px-12"
        style={{ backgroundColor: '#FAF7F2' }}
      >
        <div className="mx-auto max-w-6xl">
          <header className="mb-10">
            <p className="mb-2 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#B8924A' }}>
              Área do cliente
            </p>
            <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1A1A' }}>
              Olá, <span style={{ color: '#1F3D2E' }}>{firstName}</span>.
            </h1>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <ClientNav />
            </aside>

            <div>{children}</div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}
