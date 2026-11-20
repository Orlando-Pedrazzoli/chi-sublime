// 📄 src/app/not-found.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Página 404.
 * Title próprio + noindex: antes herdava o title da home, o que para o
 * Google parece uma "soft 404" (uma página de erro que se apresenta como
 * a página inicial).
 */
export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que procura não existe ou mudou de endereço.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <h1 className="text-display-md text-chi-green-deep mb-4 font-serif">404</h1>
      <p className="text-chi-charcoal-soft mb-8">Página não encontrada</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="bg-chi-green-deep hover:bg-chi-green-soft rounded-md px-6 py-3 transition"
          style={{ color: '#FAF7F2' }}
        >
          Voltar ao início
        </Link>
        <Link
          href="/servicos"
          className="border-chi-green-deep rounded-md border px-6 py-3 transition"
          style={{ color: '#1F3D2E' }}
        >
          Ver serviços e preços
        </Link>
      </div>
    </main>
  );
}
