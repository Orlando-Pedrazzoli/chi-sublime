import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <h1 className="text-display-md text-chi-green-deep mb-4 font-serif">404</h1>
      <p className="text-chi-charcoal-soft mb-8">Página não encontrada</p>
      <Link
        href="/"
        className="bg-chi-green-deep text-chi-cream hover:bg-chi-green-soft rounded-md px-6 py-3 transition"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
