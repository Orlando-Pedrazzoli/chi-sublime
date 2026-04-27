'use client';

/**
 * Página de erro global — capturada quando algo falha em runtime.
 * No Sprint 1 vamos estilizar com a paleta verde + dourado do Chi Sublime.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Algo correu mal</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1F3D2E',
            color: '#FAF7F2',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
