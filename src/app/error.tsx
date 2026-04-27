'use client';

/**
 * Página de erro global — capturada quando algo falha em runtime.
 * Renderizada DENTRO do RootLayout, por isso não inclui <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-chi-cream flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <h1 className="text-chi-green-deep mb-4 font-serif text-5xl font-light">Algo correu mal</h1>
      <p className="text-chi-charcoal-soft mb-8 max-w-md">
        {error.message || 'Ocorreu um erro inesperado.'}
      </p>
      <button
        onClick={reset}
        className="bg-chi-green-deep text-chi-cream hover:bg-chi-green-soft px-8 py-3 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
      >
        Tentar novamente
      </button>
    </main>
  );
}
